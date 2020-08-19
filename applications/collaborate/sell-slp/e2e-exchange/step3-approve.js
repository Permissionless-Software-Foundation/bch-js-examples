/*
  Approve partialy signed Tx for SLP tokens exchange from step2
  Assuming addresses, balances, tokens etc. are already checked in step1
*/

const Bitcoin = require('bitcoincashjs-lib')

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

const AppUtils = require('./util')
const appUtils = new AppUtils()

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerAddr = walletInfo.cashAddress
const offerWif = walletInfo.WIF
const offerECPair = bchjs.ECPair.fromWIF(offerWif)

// Open the sell signal information generated with step1-generate-signal.js
try {
  var offerMeta = require('./signal.json')
} catch (err) {
  console.log(
    'Could not open signal.json. Generate signal information with step1-generate-signal.js first.'
  )
  process.exit(0)
}

// Open the payment Tx generated with step2-payment-tx.js
try {
  var paymentMeta = require('./payment.json')
} catch (err) {
  console.log(
    'Could not open payment.json. Generate payment transaction with step2-payment-tx.js first.'
  )
  process.exit(0)
}

async function approvePaymentTx (signal, payment) {
  try {
    // console.log(`signal meta: ${JSON.stringify(signal, null, 2)}`)
    // console.log(`payment meta: ${JSON.stringify(payment, null, 2)}`)

    // UTXO with  all token information included - TxId from the signal
    const signalTxHash = signal.URI.replace('swap:', '')
    const offeredUTXO = await appUtils.getUtxoDetails(offerAddr, signalTxHash)
    // console.log(`offered UTXO: ${JSON.stringify(offeredUTXO, null, 2)}`)
    if (offeredUTXO.spentTxId) { throw new Error('Offered UTXO has already been spent') }

    const paymentFileBuffer = Buffer.from(payment, 'hex')
    const csTransaction = Bitcoin.Transaction.fromBuffer(paymentFileBuffer)
    // console.log(`payment tx: ${JSON.stringify(csTransaction, null, 2)}`)
    const csTransactionBuilder = Bitcoin.TransactionBuilder.fromTransaction(
      csTransaction,
      'mainnet'
    )
    // console.log(`tx builder: ${JSON.stringify(csTransactionBuilder, null, 2)}`)
    // console.log(csTransactionBuilder.tx.ins[1].script)
    // console.log(csTransactionBuilder.tx.outs)

    const dust = 546
    // If payment is valid, offering party countersigns and broadcasts
    csTransactionBuilder.sign(
      0,
      offerECPair,
      null,
      Bitcoin.Transaction.SIGHASH_ALL,
      dust
    )
    // build tx
    const csTx = csTransactionBuilder.build()
    // output rawhex
    const csTxHex = csTx.toHex()
    // console.log(`Fully signed Tx hex: ${csTxHex}`)
    // Broadcast transaction to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction(csTxHex)
    console.log(`Exchange Tx ID: ${txidStr}`)
    console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.error(`Error in approvePaymentTx(): ${err}`)
    throw err
  }
}
approvePaymentTx(offerMeta, paymentMeta)
