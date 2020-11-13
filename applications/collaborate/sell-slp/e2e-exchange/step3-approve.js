/*
  Approve partialy signed Tx for SLP tokens exchange from step2
  Assuming addresses, balances, tokens etc. are already checked in step1
*/

const Bitcoin = require('bitcoincashjs-lib')

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

const AppUtils = require('./util')
const appUtils = new AppUtils()

// Open the Seller's wallet generated with create-wallets.
try {
  var sellerWallet = require('../create-wallets/seller-wallet.json')
} catch (err) {
  console.log(
    'Could not open seller-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const sellerAddr = sellerWallet.cashAddress
const sellerWif = sellerWallet.WIF
const sellerECPair = bchjs.ECPair.fromWIF(sellerWif)

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

    // UTXO with  all token information included
    const signalTxHash = signal.exactUtxoTxId
    const sellerUTXO = await appUtils.getUtxoDetails(sellerAddr, signalTxHash)
    console.log(`offered UTXO: ${JSON.stringify(sellerUTXO, null, 2)}`)

    // Ensure the UTXO has not been spent.
    if (sellerUTXO.spentTxId) {
      throw new Error('Offered UTXO has already been spent')
    }

    // Convert the hex string version of the transaction into a Buffer.
    const paymentFileBuffer = Buffer.from(payment, 'hex')

    // Generate a Transaction object from the transaction binary data.
    const csTransaction = Bitcoin.Transaction.fromBuffer(paymentFileBuffer)
    // console.log(`payment tx: ${JSON.stringify(csTransaction, null, 2)}`)

    // Instantiate the Transaction Builder.
    const csTransactionBuilder = Bitcoin.TransactionBuilder.fromTransaction(
      csTransaction,
      'mainnet'
    )
    // console.log(`tx builder: ${JSON.stringify(csTransactionBuilder, null, 2)}`)
    // console.log(csTransactionBuilder.tx.ins[1].script)
    // console.log(csTransactionBuilder.tx.outs)

    // At this point, it would be up to the Seller's wallet to verify that the
    // transaction has not been manipulated by the Buyer. For the sake of this
    // example, it is assumed that the transaction is valid.

    // If payment is valid, offering party countersigns their input in the
    // transaction.
    const dust = 546
    csTransactionBuilder.sign(
      0,
      sellerECPair,
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
