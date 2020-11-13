/*
  Combine all partial signed transactions in one complete one
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')
const Bitcoin = require('bitcoincashjs-lib')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// const fs = require('fs')

// Open the all signed tx information generated with step3-sign-own-tx.js
try {
  var signedInputTxs = [
    require('./signed_tx_0.json'),
    require('./signed_tx_1.json'),
    require('./signed_tx_2.json')
  ]
} catch (err) {
  console.log(
    'Could not open unsigned_tx.json. Generate tx information with step2-unsigned-tx.js first.'
  )
  process.exit(0)
}

// Combine all signed inputs and all outputs in a valid Tx
async function combineAllInputs () {
  try {
    // Convert the hex string version of the first partially-signed transaction into a Buffer.
    const txBuffer = Buffer.from(signedInputTxs[0], 'hex')

    // Generate a Transaction object from the transaction binary data.
    const txObj = Bitcoin.Transaction.fromBuffer(txBuffer)
    // console.log(`partially-signed tx object: ${JSON.stringify(txObj, null, 2)}`)
    // console.log(`First partially-signed txObj.ins: ${JSON.stringify(txObj.ins, null, 2)}`)

    // Convert the second partially-signed TX from hex into a TX object.
    const txBuffer2 = Buffer.from(signedInputTxs[1], 'hex')
    const txObj2 = Bitcoin.Transaction.fromBuffer(txBuffer2)

    // Convert the third partially-signed TX from hex into a TX object.
    const txBuffer3 = Buffer.from(signedInputTxs[2], 'hex')
    const txObj3 = Bitcoin.Transaction.fromBuffer(txBuffer3)

    // Overwrite the tx inputs of the first partially-signed TX with the signed
    // inputs from the other two transactions.
    txObj.ins[1].script = txObj2.ins[1].script
    txObj.ins[2].script = txObj3.ins[2].script

    // console.log(`Fully-signed txObj.ins: ${JSON.stringify(txObj.ins, null, 2)}`)

    // Port the transaction object into the TransactionBuilder.
    const transactionBuilder = Bitcoin.TransactionBuilder.fromTransaction(
      txObj,
      'mainnet'
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const txHex = tx.toHex()

    // const finalTx = await bchjs.RawTransactions.decodeRawTransaction(txHex)
    // console.log(`finalTx: ${JSON.stringify(finalTx, null, 2)}`)

    // Broadcast transaction to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction(txHex)
    console.log(`Exchange Tx ID: ${txidStr}`)
    console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in combineAllInputs():', err)
    throw err
  }
}
combineAllInputs()
