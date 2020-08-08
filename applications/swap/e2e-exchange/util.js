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

// let bfp
// if (NETWORK === 'mainnet') bfp = new BFP(bchjs, 'mainnet')
// else bfp = new BFP(bchjs, 'testnet')

let _this

class Util {
  constructor () {
    _this = this
    this.bchjs = bchjs
    this.util = util
  }

  int2FixedBuffer (amount, size) {
    let hex = amount.toString(16)
    hex = hex.padStart(size * 2, '0')
    if (hex.length % 2) hex = '0' + hex
    return Buffer.from(hex, 'hex')
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
      const txBuilder = new _this.bchjs.TransactionBuilder()

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
}

module.exports = Util
