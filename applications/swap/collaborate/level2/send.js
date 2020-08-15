/*
  Upload IPFS JSON file with encrypted message and
  send signal via plain message in Tx OP_RETURN
*/

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

const eccrypto = require('eccrypto-js')

const AppUtils = require('../util')
const appUtils = new AppUtils()

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the accepting part wallet generated with create-wallets.
try {
  var walletInfo1 = require('../../create-wallets/wallet-1.json')
} catch (err) {
  console.log(
    'Could not open wallet-1.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerWif = walletInfo.WIF
const acceptAddr = walletInfo1.cashAddress // plain bitcoin:.... address
const MESSAGE = 'SWAP empty'

async function sendUTXO (msg, to, wif) {
  try {
    // Create an EC Key Pair from the user-supplied WIF.
    const ecPair = bchjs.ECPair.fromWIF(wif)

    // Generate the public address that corresponds to this WIF.
    const addr = bchjs.ECPair.toCashAddress(ecPair)
    console.log(`Sending "${msg}" to ${to} as ${addr}`)

    // -----[ New in Level 2 - encryption ]------
    // retrieve public key from the blockchain TXs
    const publicKey = await appUtils.getPublicKey(to)
    console.log(`public key: ${JSON.stringify(publicKey, null, 2)}`)
    // Encrypt the message with the public key.
    const pubKeyBuf = Buffer.from(publicKey, 'hex')
    const msgBuf = eccrypto.utf8ToBuffer(msg)
    const structuredEj = await eccrypto.encrypt(pubKeyBuf, msgBuf)
    // Serialize the encrypted data object
    const encryptedEj = Buffer.concat([
      structuredEj.ephemPublicKey,
      structuredEj.iv,
      structuredEj.ciphertext,
      structuredEj.mac
    ])
    const encryptedMsg = encryptedEj.toString('hex')
    console.log(`encrypted msg: ${JSON.stringify(encryptedMsg, null, 2)}`)

    // -----[ New in Level 2 - send encrypted msg to IPFS ]------
    // Generate a JSON object to upload to IPFS.
    const exportData = {
      to: to,
      payload: encryptedMsg
    }

    // Write the JSON object to a JSON file.
    const ipfsHosting = await appUtils.uploadToIpfs(exportData)
    console.log(
      `Sending ${ipfsHosting.paymentAmount} BCH to ${ipfsHosting.paymentAddr} to pay for IPFS hosting of message.`
    )

    // Generate a transaction to pay IPFS hosting fee.
    const ipfsFee = bchjs.BitcoinCash.toSatoshi(ipfsHosting.paymentAmount)
    const hostingHex = await appUtils.buildPaymentTx(ipfsHosting.paymentAddr, ipfsFee, wif)
    // console.log(`hostingHex: ${hostingHex}`)

    // Broadcast the hosting payment transaction.
    const hostingTxid = await bchjs.RawTransactions.sendRawTransaction(hostingHex)
    console.log(`hostingTxid: ${hostingTxid}`)

    // Wait for the IPFS file server to return an IPFS hash.
    const ipfsHash = await appUtils.waitForIpfsHash(ipfsHosting.fileId)
    console.log(`ipfsHash: ${ipfsHash}`)
    // ---------[ IPFS hosting end ]--------

    // All UTXO for address
    const utxoData = await bchjs.Electrumx.utxo(addr)
    if (!utxoData.success) throw new Error(`Could not get UTXOs for address ${addr}`)
    const utxos = utxoData.utxos
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // BCH UTXO to pay for the exchange
    const utxo = await appUtils.findBiggestUtxo(utxos)
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // ------[ TX BUILD START ]------
    const originalAmount = utxo.value // payment for IPFS substracted
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // instance of transaction builder
    let transactionBuilder
    if (NETWORK === 'mainnet') {
      transactionBuilder = new bchjs.TransactionBuilder()
    } else transactionBuilder = new bchjs.TransactionBuilder('testnet')

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // Add the OP_RETURN to the transaction - IPFS upload signal.
    const fee = 500 // signal transaction cost
    const dust = 546 // inside Tx
    const script = [
      bchjs.Script.opcodes.OP_RETURN,
      Buffer.from('6d02', 'hex'), // Makes message comply with the memo.cash protocol.
      Buffer.from(`MSG IPFS ${ipfsHash} encrypted`)
    ]
    const data = bchjs.Script.encode(script)
    // console.log(`encoded data: ${JSON.stringify(data, null, 2)}`)

    // Add the OP_RETURN output.
    transactionBuilder.addOutput(data, 0)

    // pay the fees and return the rest
    transactionBuilder.addOutput(addr, originalAmount - fee - dust)
    // ------[ TX BUILD END ]------

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      ecPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    const tx = transactionBuilder.build()
    const hex = tx.toHex()

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction(hex)
    console.log(`Signal Tx ID: ${txidStr}`)
    console.log(`https://memo.cash/post/${txidStr}`)
    console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in generateUTXO: ', err)
    process.exit(0)
  }
}
sendUTXO(MESSAGE, acceptAddr, offerWif)
