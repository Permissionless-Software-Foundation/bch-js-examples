/*
  Generate collaborative transaction for SLP tokens exchange
  Assuming addresses, balances, tokens etc. are already checked in step1
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

const offerWif = walletInfo.WIF
const MESSAGE = 'SWAP empty'

async function sendUTXO (msg, wif) {
  try {
    // Create an EC Key Pair from the user-supplied WIF.
    const ecPair = bchjs.ECPair.fromWIF(wif)

    // Generate the public address that corresponds to this WIF.
    const addr = bchjs.ECPair.toCashAddress(ecPair)
    console.log(`Sending "${msg}" as ${addr}`)

    // All UTXO for address
    const utxoData = await bchjs.Electrumx.utxo(addr)
    if (!utxoData.success) throw new Error(`Could not get UTXOs for address ${addr}`)
    const utxos = utxoData.utxos
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // BCH UTXO to pay for the exchange
    const utxo = await appUtils.findBiggestUtxo(utxos)
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // ------[ TX BUILD START ]------
    const originalAmount = utxo.value
    const fee = 500
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // instance of transaction builder
    let transactionBuilder
    if (NETWORK === 'mainnet') {
      transactionBuilder = new bchjs.TransactionBuilder()
    } else transactionBuilder = new bchjs.TransactionBuilder('testnet')

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // Add the OP_RETURN to the transaction.
    // TODO: swap format
    const script = [
      bchjs.Script.opcodes.OP_RETURN,
      Buffer.from('6d02', 'hex'), // Makes message comply with the memo.cash protocol.
      Buffer.from(`${msg}`)
    ]
    const data = bchjs.Script.encode(script)
    // console.log(`encoded data: ${JSON.stringify(data, null, 2)}`)

    // Add the OP_RETURN output.
    transactionBuilder.addOutput(data, 0)

    // pay the fee return the rest
    transactionBuilder.addOutput(addr, originalAmount - fee)
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
    // console.log(`tx: ${JSON.stringify(tx, null, 2)}`)

    const hex = tx.toHex()
    console.log(`Transaction raw hex: ${hex}`)

    // Broadcast transation to the network
    // const txidStr = await bchjs.RawTransactions.sendRawTransaction(hex)
    // console.log(`Transaction ID: ${txidStr}`)
    // console.log(`https://memo.cash/post/${txidStr}`)
    // console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in generateUTXO: ', err)
    process.exit(0)
  }
}
sendUTXO(MESSAGE, offerWif)
