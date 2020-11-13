/*
  Create unsigned transaction from all inputs combined in step 1
*/

const endAddr = 'bitcoincash:qrjkthjjsku2qv7ycakyhv828pruv2gfuyk23480vr'
const paymentAmount = 1000

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

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

async function calculateFee () {
  // Calculate miner fees.
  // Get byte count (x inputs, pay + remainder = 2x outputs)
  return bchjs.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2 })
}

// Combine all accounts inputs and outputs in one unsigned Tx
async function buildUnsignedTx () {
  try {
    // console.log(`inputs: ${JSON.stringify(combinedInputs, null, 2)}`)

    const fee = await calculateFee()
    const satsNeeded = fee + paymentAmount
    // console.log(`payment (+fee): ${satsNeeded}`)

    const transactionBuilder = new bchjs.TransactionBuilder()

    combinedInputs.forEach(async function (account) {
      const utxo = account.utxo
      transactionBuilder.addInput(utxo.tx_hash, utxo.tx_pos)
      const originalAmount = utxo.value
      const remainder = originalAmount - satsNeeded
      if (remainder < 1) {
        throw new Error('Selected UTXO does not have enough satoshis')
      }
      // Send payment
      transactionBuilder.addOutput(endAddr, satsNeeded)
      // Send the BCH change back to the payment part
      transactionBuilder.addOutput(account.address, remainder - 300)
    })

    const tx = transactionBuilder.transaction.buildIncomplete()
    const hex = tx.toHex()
    // console.log(`Non-signed Tx hex: ${hex}`)
    fs.writeFileSync('unsigned_tx.json', JSON.stringify(hex, null, 2))
    console.log('unsigned_tx.json written successfully.')
  } catch (err) {
    console.error(`Error in buildUnsignedTx(): ${err}`)
    throw err
  }
}
buildUnsignedTx()
