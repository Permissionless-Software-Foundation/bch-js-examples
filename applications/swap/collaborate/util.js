const util = require('util')
util.inspect.defaultOptions = {
  showHidden: true,
  colors: true,
  depth: 1
}

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

const BFP = require('bitcoinfiles-node').bfp

const fs = require('fs')

// let bfp
// if (NETWORK === 'mainnet') bfp = new BFP(bchjs, 'mainnet')
// else bfp = new BFP(bchjs, 'testnet')

let _this

class Util {
  constructor () {
    _this = this
    this.bchjs = bchjs
    this.util = util
    this.fs = fs
  }

  int2FixedBuffer (amount, size) {
    let hex = amount.toString(16)
    hex = hex.padStart(size * 2, '0')
    if (hex.length % 2) hex = '0' + hex
    return Buffer.from(hex, 'hex')
  }

  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get the balance in BCH of a BCH address.
  // assume parameters are already checked
  async getBCHBalance (addr) {
    try {
      const result = await _this.bchjs.Electrumx.balance(addr)
      // console.log(result)

      // The total balance is the sum of the confirmed and unconfirmed balances.
      const satBalance =
        Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

      // Convert the satoshi balance to a BCH balance
      // const bchBalance = _this.bchjs.BitcoinCash.toBitcoinCash(satBalance)
      // return bchBalance

      return satBalance
    } catch (err) {
      console.error('Error in getBCHBalance: ', err)
      console.log(`addr: ${addr}`)
      throw err
    }
  }

  // Get the balance in tokens of a SLP address.
  // assume parameters are already checked
  async getTokenBalance (slpAddr, tokenId) {
    try {
      // this method generate exception
      // const tokenBalance = await _this.bchjs.SLP.Utils.balance(slpAddr, tokenId)
      // using work around
      const tokens = await _this.bchjs.SLP.Utils.balancesForAddress(slpAddr)
      // console.log(JSON.stringify(tokens, null, 2))

      if (tokens === 'No balance for this address') return 0

      const tokenData = tokens.find(t => t.tokenId === tokenId)
      // console.log(JSON.stringify(tokenData, null, 2))

      if (tokenData === undefined) return 0

      return tokenData.balance
    } catch (err) {
      console.error('Error in getTokenBalance: ', err)
      console.log(`slpAddr: ${slpAddr}`)
      throw err
    }
  }

  // get 'hydrated' (with SLP details) transactions for address
  async getTokenUtxos (addr, tokenId) {
    try {
      const result = await _this.bchjs.Electrumx.utxo(addr)
      // console.log(`token utxos: ${JSON.stringify(result, null, 2)}`)
      if (result.utxos.length === 0) throw new Error('No UTXOs found.')

      // hydrate utxo data with SLP details
      let tokenUtxos = await _this.bchjs.SLP.Utils.tokenUtxoDetails(result.utxos)
      // console.log(`utxos: ${JSON.stringify(tokenUtxos, null, 2)}`)
      tokenUtxos = tokenUtxos.filter(function (utxo) {
        if (utxo.tokenId === tokenId) return true
        return false
      })

      return tokenUtxos
    } catch (err) {
      console.error('Error in getTokenUtxos: ', err)
      console.log(`slpAddr: ${addr}`)
      throw err
    }
  }

  // Get hydrated UTXO information
  async getUtxoDetails (addr, txId) {
    try {
      const result = await _this.bchjs.Electrumx.utxo(addr)
      // console.log(`token utxos: ${JSON.stringify(result, null, 2)}`)
      if (result.utxos.length === 0) throw new Error('No UTXOs found.')

      // hydrate utxo data with SLP details
      let tokenUtxos = await _this.bchjs.SLP.Utils.tokenUtxoDetails(result.utxos)

      tokenUtxos = tokenUtxos.filter(function (utxo) {
        if (utxo.tx_hash === txId) return true
        return false
      })
      // console.log(`token utxos: ${JSON.stringify(tokenUtxos[0], null, 2)}`)
      return tokenUtxos[0]
    } catch (err) {
      console.error('Error in getUtxoDetails: ', err)
      console.log(`txId: ${txId}`)
      throw err
    }
  }

  // Get biggest UTXO
  // Returns the utxo with the biggest balance from an array of utxos.
  async findBiggestUtxo (utxos) {
    try {
      let largestAmount = 0
      let largestIndex = 0

      for (var i = 0; i < utxos.length; i++) {
        const thisUtxo = utxos[i]
        // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

        // Validate the UTXO data with the full node.
        const txout = await _this.bchjs.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
        if (txout === null) {
          // If the UTXO has already been spent, the full node will respond with null.
          console.log(
            'Stale UTXO found. You may need to wait for the indexer to catch up.'
          )
          continue
        }

        if (thisUtxo.value > largestAmount) {
          largestAmount = thisUtxo.value
          largestIndex = i
        }
      }

      return utxos[largestIndex]
    } catch (err) {
      console.error('Error in findBiggestUtxo: ', err)
      throw err
    }
  }

  // Get a public key by searching transactions on the blockchain.
  // Code from christrout/bch-encrypt
  // assume parameters are already checked
  async getPublicKey (addr) {
    // Retrieve the transaction history for this address.
    const txHistory = await _this.bchjs.Electrumx.transactions(addr)
    // console.log(`txHistory: ${JSON.stringify(txHistory, null, 2)}`)

    if (txHistory.transactions.length === 0) {
      throw new Error('No transaction history.')
    }

    // Loop through the transaction history and search for the public key.
    for (let i = 0; i < txHistory.transactions.length; i++) {
      const thisTx = txHistory.transactions[i].tx_hash
      // console.log(`txid: ${thisTx}`)

      const txDetails = await _this.bchjs.RawTransactions.getRawTransaction(
        thisTx,
        true
      )
      // console.log(`txDetails: ${JSON.stringify(txDetails, null, 2)}`)

      const vin = txDetails.vin

      // Loop through each input.
      for (let j = 0; j < vin.length; j++) {
        const thisVin = vin[j]
        // console.log(`thisVin: ${JSON.stringify(thisVin, null, 2)}`)

        // Extract the script signature.
        const scriptSig = thisVin.scriptSig.asm.split(' ')
        // console.log(`scriptSig: ${JSON.stringify(scriptSig, null, 2)}`)

        // Extract the public key from the script signature.
        const pubKey = scriptSig[scriptSig.length - 1]
        // console.log(`pubKey: ${pubKey}`)

        // Generate cash address from public key.
        const keyBuf = Buffer.from(pubKey, 'hex')
        const ec = _this.bchjs.ECPair.fromPublicKey(keyBuf)
        const cashAddr2 = _this.bchjs.ECPair.toCashAddress(ec)
        // console.log(`cashAddr2: ${cashAddr2}`)

        // If public keys match, this is the correct public key.
        if (addr === cashAddr2) {
          return pubKey
        }
      }
    }

    return false
  }

  // Upload signal transaction
  async uploadSignal (msgType, // exchange = 1, escrow = 2
    fundingWif,
    dataObj // object with signal data
  ) {
    try {
      const configMeta = {
        msgClass: 1,
        msgType: msgType
      }

      if (msgType === 1) {
        configMeta.tokenId = dataObj.tokenId
        configMeta.buyOrSell = dataObj.buyOrSell
        configMeta.rate = dataObj.rate
        configMeta.reserve = dataObj.reserve ? 1 : 0
        configMeta.exactUtxoTxId = dataObj.exactUtxoTxId ? dataObj.exactUtxoTxId : 0
        configMeta.exactUtxoIndex = dataObj.exactUtxoIndex ? dataObj.exactUtxoIndex : 0
        configMeta.minSatsToExchange = dataObj.minSatsToExchange
      }

      const fundingECPair = _this.bchjs.ECPair.fromWIF(fundingWif)
      const fundingAddress = _this.bchjs.ECPair.toCashAddress(fundingECPair)
      // Get the balance of the offering address.
      const fundingBalance = await _this.getBCHBalance(fundingAddress)

      const fileSize = 0 // there is no file
      const uploadCost = BFP.calculateFileUploadCost(fileSize, dataObj)
      console.log(`Upload cost: ${uploadCost} satoshis`)

      if (uploadCost > fundingBalance) {
        const errorMsg = `Inefficient funds to send signal. Needed: ${uploadCost}. Have: ${fundingBalance}`
        console.log(errorMsg)
        throw new Error(errorMsg)
      }

      const utxos = await _this.bchjs.Electrumx.utxo(fundingAddress)
      // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)
      if (!utxos.success) throw new Error(`Could not get UTXOs for address ${fundingAddress}`)

      const biggestUtxo = await _this.findBiggestUtxo(utxos.utxos)
      // console.log(`biggest utxo: ${JSON.stringify(biggestUtxo, null, 2)}`)

      // instance of transaction builder
      let txBuilder
      if (NETWORK === 'mainnet') {
        txBuilder = new _this.bchjs.TransactionBuilder()
      } else txBuilder = new _this.bchjs.TransactionBuilder('testnet')

      const originalAmount = biggestUtxo.value
      const vout = biggestUtxo.tx_pos
      const txid = biggestUtxo.tx_hash

      // add Tx input and outputs
      txBuilder.addInput(txid, vout)
      txBuilder.addOutput(fundingAddress, originalAmount - uploadCost)

      // add SWaP OP_RETURN
      const script = await _this.buildSignalMeta(configMeta)
      const data = _this.bchjs.Script.encode2(script)
      // console.log(`data: ${_this.util.inspect(data)}`)
      txBuilder.addOutput(data, 0)

      // sign the tx
      let redeemScript
      txBuilder.sign(0, fundingECPair, redeemScript, txBuilder.hashTypes.SIGHASH_ALL, originalAmount)

      // build Tx
      const tx = txBuilder.build()
      const hex = tx.toHex()
      // console.log(`Tx HEX: ${hex}`)

      // broadcast the tx
      // const txidStr = await _this.bchjs.RawTransactions.sendRawTransaction(hex)
      // console.log(`Signal Transaction ID: ${txidStr}`)
      // console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
      // return txidStr

      return hex
    } catch (err) {
      console.error('Error in uploadSignal: ', err)
      throw err
    }
  }

  // construct signal data from config
  async buildSignalMeta (config) {
    const lokadIdHex = '53575000' // <lokad_id_int> = 'SWP\x00'>
    try {
      // console.log(`config: ${JSON.stringify(config, null, 2)}`)
      const script = [
        _this.bchjs.Script.opcodes.OP_RETURN,
        Buffer.from(`${lokadIdHex}`, 'hex'),
        _this.int2FixedBuffer(config.msgClass, 1),
        _this.int2FixedBuffer(config.msgType, 1),
        Buffer.from(config.tokenId, 'hex')
      ]

      if (config.msgType === 1) {
        const validActions = ['BUY', 'SELL']
        const action = config.buyOrSell.toUpperCase()
        if (validActions.includes(action)) {
          script.push(Buffer.from(action))
        } else {
          throw new Error('Action must be either BUY or SELL')
        }
      }

      script.push(_this.int2FixedBuffer(config.rate, 1))
      script.push(_this.int2FixedBuffer(config.rate, 1))
      script.push(Buffer.from(config.exactUtxoTxId, 'hex'))
      script.push(_this.int2FixedBuffer(config.exactUtxoIndex, 1))
      script.push(_this.int2FixedBuffer(config.minSatsToExchange, 1))
      // console.log(`script: ${_this.util.inspect(script)}`)

      return script
    } catch (err) {
      console.error('Error in buildSignalMeta: ', err)
      throw err
    }
  }

  // Poll the IPFS file server until it returns an IPFS hash
  async waitForIpfsHash (fileId) {
    try {
      if (!fileId) {
        throw new Error('File ID required to get info from IPFS hosting server.')
      }

      let ipfsHash = ''
      while (!ipfsHash) {
        // Wait for 30 seconds.
        console.log('waiting for IPFS upload confirm...')
        await _this.sleep(30000)

        const result = await _this.bchjs.IPFS.getStatus(fileId)
        console.log(`result: ${JSON.stringify(result, null, 2)}`)

        if (result.ipfsHash) ipfsHash = result.ipfsHash
      }

      return ipfsHash
    } catch (err) {
      console.error(`Error in waitForIpfsHash(): ${err}`)
      throw err
    }
  }

  // Write an object to a JSON file.
  writeObject (obj) {
    return new Promise(function (resolve, reject) {
      let filename
      try {
        const fileStr = JSON.stringify(obj, null, 2)

        // Generate a random filename.
        const serialNum = Math.floor(100000000 * Math.random())
        filename = `${serialNum}.json`

        _this.fs.writeFile(`./${filename}`, fileStr, function (err) {
          if (err) {
            console.error(`Error while trying to write ${filename} file.`)
            return reject(err)
          }
          return resolve(filename)
        })
      } catch (err) {
        console.error(
          `Error trying to write out ${filename} file in writeObject.`
        )
        return reject(err)
      }
    })
  }

  // Delete the file that was generate with writeObject.
  deleteFile (filename) {
    try {
      fs.unlinkSync(`./${filename}`)
    } catch (err) {
      console.error(`Error in deleteFile(): ${err}`)
      throw err
    }
  }

  // Upload an object to IPFS as a JSON file.
  async uploadToIpfs (obj) {
    try {
      // Write the object to a temporary file.
      const filename = await _this.writeObject(obj)

      // Request a BCH address and amount of BCH to pay for hosting the file.
      const fileModel = await _this.bchjs.IPFS.createFileModel(`./${filename}`)
      // console.log(`fileModel: ${JSON.stringify(fileModel, null, 2)}`)

      // This file ID is used to identify the file we're about to upload.
      const fileId = fileModel.file._id
      // console.log(`ID for your file: ${fileId}`)

      // Upload the actual file, include the ID assigned to it by the server.
      await _this.bchjs.IPFS.uploadFile(`./${filename}`, fileId)
      // console.log(`fileObj: ${JSON.stringify(fileObj, null, 2)}`)

      _this.deleteFile(filename)

      return {
        paymentAddr: fileModel.file.bchAddr,
        paymentAmount: fileModel.hostingCostBCH,
        fileId: fileId
      }
    } catch (err) {
      console.error(`Error in uploadToIpfs(): ${err}`)
      throw err
    }
  }

  paymentPerByte () {
    // get byte count to calculate fee. paying 1 sat/byte
    const byteCount = _this.bchjs.BitcoinCash.getByteCount(
      { P2PKH: 1 },
      { P2PKH: 2 }
    )
    const satoshisPerByte = 1.1
    return Math.floor(satoshisPerByte * byteCount)
  }

  // broadcast single in single out Tx to pay amount to addr
  // addr: address to pay to
  // amount: amount to pay
  // wif: private key of the paying part
  // utxo: UTXO with funds to pay from
  async buildPaymentTx (addr, amount, wif) {
    try {
      // Create an EC Key Pair from the user-supplied WIF.
      const ecPair = _this.bchjs.ECPair.fromWIF(wif)

      // Generate the public address that corresponds to this WIF.
      const payAddr = _this.bchjs.ECPair.toCashAddress(ecPair)
      // console.log(`Publishing ${hash} to ${ADDR}`)

      // All UTXO for address
      const utxoData = await _this.bchjs.Electrumx.utxo(payAddr)
      if (!utxoData.success) throw new Error(`Could not get UTXOs for address ${payAddr}`)
      const utxos = utxoData.utxos
      // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

      // BCH UTXO to pay for the exchange
      const utxo = await _this.findBiggestUtxo(utxos)
      // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

      // instance of transaction builder
      let transactionBuilder
      if (NETWORK === 'mainnet') {
        transactionBuilder = new _this.bchjs.TransactionBuilder()
      } else transactionBuilder = new _this.bchjs.TransactionBuilder('testnet')

      const originalAmount = utxo.value
      const vout = utxo.tx_pos
      const txid = utxo.tx_hash

      const txFee = _this.paymentPerByte()
      // add input with txid and index of vout
      transactionBuilder.addInput(txid, vout)

      // Send the payment for IPFS hosting.
      transactionBuilder.addOutput(addr, amount)

      // Send the change back to the yourself.
      transactionBuilder.addOutput(payAddr, originalAmount - amount - txFee)

      // Sign the transaction with the HD node.
      let redeemScript
      transactionBuilder.sign(
        0,
        ecPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        originalAmount
      )

      // build tx
      const tx = transactionBuilder.build()
      // output rawhex
      const hex = tx.toHex()

      return hex
    } catch (err) {
      console.error(`Error in buildPaymentTx(): ${err}`)
      throw err
    }
  }

  // Converts a serialized buffer containing encrypted data into an object
  // that can interpreted by the eccryptoJS library.
  convertToEncryptStruct (encbuf) {
    try {
      let offset = 0
      const tagLength = 32
      let pub
      switch (encbuf[0]) {
        case 4:
          pub = encbuf.slice(0, 65)
          break
        case 3:
        case 2:
          pub = encbuf.slice(0, 33)
          break
        default:
          throw new Error(`Invalid type: ${encbuf[0]}`)
      }
      offset += pub.length

      const c = encbuf.slice(offset, encbuf.length - tagLength)
      const ivbuf = c.slice(0, 128 / 8)
      const ctbuf = c.slice(128 / 8)
      const d = encbuf.slice(encbuf.length - tagLength, encbuf.length)

      return {
        iv: ivbuf,
        ephemPublicKey: pub,
        ciphertext: ctbuf,
        mac: d
      }
    } catch (err) {
      console.error(`Error in convertToEncryptStruct(): ${err}`)
      throw err
    }
  }
}

module.exports = Util
