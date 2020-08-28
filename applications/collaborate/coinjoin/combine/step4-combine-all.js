/*
  Combine all partial signed transactions in one complete one
*/

const endAddr = 'bitcoincash:qrjkthjjsku2qv7ycakyhv828pruv2gfuyk23480vr'
const paymentAmount = 1000

const Bitcoin = require('bitcoincashjs-lib')

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
// const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: MAINNET_API_FREE })

const fs = require('fs')

// Open the combined inputs information generated with step1-combine-inputs.js
try {
  var combinedInputs = require('./combined_inputs.json')
} catch (err) {
  console.log(
    'Could not open combined_inputs.json. Generate inputs information with step1-combine-inputs.js first.'
  )
  process.exit(0)
}

// Open the all signed tx information generated with step3-sign-own-tx.js
try {
  var signedInputs = [
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

// Combine all signed inputs and all outputs in a valid Tx
async function combineAllInputs () {
  try {
    console.log(`tx: ${JSON.stringify(unsignedTx, null, 2)}`)
    console.log('Tx created.')
  } catch (err) {
    console.error(`Error in combineAllInputs(): ${err}`)
    throw err
  }
}
combineAllInputs()
