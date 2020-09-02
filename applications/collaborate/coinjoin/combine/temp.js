/*
  Combine all partial signed transactions in one complete one
*/

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
// const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')
const Bitcoin = require('bitcoincashjs-lib')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: MAINNET_API_FREE })

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

// Open the unsigned tx information generated with step2-unsigned-tx.js
try {
  var unsignedTx = require('./unsigned_tx.json')
} catch (err) {
  console.log(
    'Could not open unsigned_tx.json. Generate tx information with step2-unsigned-tx.js first.'
  )
  process.exit(0)
}

// extract ONLY SIGNED inputs from a transaction copy
// result [{txId: '', scriptSig: ''}, ...]
async function extractSignedInputs (allInputs) {
  const signedInputs = []
  for (let i = 0; i < allInputs.length; i++) {
    const txHex = allInputs[i]
    const decodedTx = await bchjs.RawTransactions.decodeRawTransaction(txHex)
    decodedTx.vin.forEach(function (input) {
      // console.log(`tx: ${JSON.stringify(input.txid, null, 2)}`)
      if (input.scriptSig.hex !== '') {
        signedInputs.push({ txId: input.txid, scriptSig: input.scriptSig })
      }
    })
  }
  // console.log(`inputs: ${JSON.stringify(signedInputs, null, 2)}`)
  return signedInputs
}

// Combine all signed inputs and all outputs in a valid Tx
async function combineAllInputs () {
  try {
    // console.log(`tx: ${JSON.stringify(unsignedTx, null, 2)}`)

    const decodedTx = await bchjs.RawTransactions.decodeRawTransaction(unsignedTx)
    console.log(`raw unsigned tx: ${JSON.stringify(decodedTx, null, 2)}`)
    console.log('\n\n')

    // extract ONLY SIGNED INPUTS from all transactions copies
    const onlySignedInputs = await extractSignedInputs(signedInputTxs)
    console.log(`signed inputs: ${JSON.stringify(onlySignedInputs, null, 2)}`)
    console.log('\n\n')

    // Convert the hex string version of the first partially-signed transaction into a Buffer.
    const txBuffer = Buffer.from(signedInputTxs[0], 'hex')

    // Generate a Transaction object from the transaction binary data.
    const txObj = Bitcoin.Transaction.fromBuffer(txBuffer)
    // console.log(`partially-signed tx object: ${JSON.stringify(txObj, null, 2)}`)
    console.log(`First partially-signed txObj.ins: ${JSON.stringify(txObj.ins, null, 2)}`)
    console.log('\n\n')

    // Convert each input Buffer into a hex string.
    // for (let i = 0; i < txObj.ins.length; i++) {
    //   const thisIn = txObj.ins[i]
    //
    //   const hash = thisIn.hash
    //   const hashHex = hash.toString('hex')
    //   const script = thisIn.script
    //   const scriptHex = script.toString('hex')
    //   console.log(`Input ${i}, hash: ${hashHex}`)
    //   console.log(`Input ${i}, script: ${scriptHex}`)
    // }

    // Convert the second partially-signed TX from hex into a TX object.
    const txBuffer2 = Buffer.from(signedInputTxs[1], 'hex')
    const txObj2 = Bitcoin.Transaction.fromBuffer(txBuffer2)

    // Convert the third partially-signed TX from hex into a TX object.
    const txBuffer3 = Buffer.from(signedInputTxs[2], 'hex')
    const txObj3 = Bitcoin.Transaction.fromBuffer(txBuffer3)

    // Overwrite the tx inputs of the first partially-signed TX.
    txObj.ins[1].script = txObj2.ins[1].script
    txObj.ins[2].script = txObj3.ins[2].script

    console.log(`Fully-signed txObj.ins: ${JSON.stringify(txObj.ins, null, 2)}`)
    console.log('\n\n')

    // const transactionBuilder = new bchjs.TransactionBuilder()
    //
    // const inputScripts = []
    // for (let i = 0; i < onlySignedInputs.length; i++) {
    //   const input = onlySignedInputs[i]
    //   transactionBuilder.addInput(input.txId, i)
    //   const scriptBuffer = Buffer.from(input.scriptSig.hex, 'hex')
    //   inputScripts.push({ vout: i, script: scriptBuffer })
    // }
    //
    // decodedTx.vout.forEach(function (output) {
    //   transactionBuilder.addOutput(
    //     output.scriptPubKey.addresses[0],
    //     bchjs.BitcoinCash.toSatoshi(output.value)
    //   )
    // })
    //
    // transactionBuilder.addInputScripts(inputScripts)

    const csTransactionBuilder = Bitcoin.TransactionBuilder.fromTransaction(
      txObj,
      'mainnet'
    )

    // build tx
    const tx = csTransactionBuilder.build()
    // output rawhex
    const txHex = tx.toHex()

    const finalTx = await bchjs.RawTransactions.decodeRawTransaction(txHex)
    console.log(`finalTx: ${JSON.stringify(finalTx, null, 2)}`)

    // console.log(`Valid Tx hex: ${txHex}`)
    // fs.writeFileSync('combined_tx.json', JSON.stringify(txHex, null, 2))
    // console.log('combined_tx.json written successfully.')

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
