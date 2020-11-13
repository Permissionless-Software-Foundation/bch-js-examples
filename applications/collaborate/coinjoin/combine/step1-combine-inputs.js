/*
  Combine payment UTXOs for all participants and send it to the server
  Sending is simulated by writing JSON file
*/

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

const fs = require('fs')

// Open Alice's wallet generated with create-wallets.
try {
  var aliceWallet = require('../create-wallets/alice-wallet.json')
} catch (err) {
  console.log(
    'Could not open alice-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open Bob's wallet generated with create-wallets.
try {
  var bobWallet = require('../create-wallets/bob-wallet.json')
} catch (err) {
  console.log(
    'Could not open bob-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open Sam's wallet generated with create-wallets.
try {
  var samWallet = require('../create-wallets/sam-wallet.json')
} catch (err) {
  console.log(
    'Could not open sam-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const aliceAddr = aliceWallet.cashAddress
const bobAddr = bobWallet.cashAddress
const samAddr = samWallet.cashAddress

async function findPaymentUTXO (address) {
  try {
    // All UTXOs for the address
    const utxos = await bchjs.Electrumx.utxo(address)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)
    if (!utxos.success) {
      throw new Error(`Could not get UTXOs for address ${address}`)
    }

    // BCH UTXO to pay for the exchange
    const paymentUtxo = await appUtils.findBiggestUtxo(utxos.utxos)
    console.log(`payment UTXO: ${JSON.stringify(paymentUtxo, null, 2)}`)
    return paymentUtxo
  } catch (err) {
    console.error(`Error in supportTx(): ${err}`)
    throw err
  }
}

// Combine all accounts input payment UTXOs (id and pos)
async function combineInputs () {
  try {
    const combinedInputs = [
      { address: aliceAddr, utxo: await findPaymentUTXO(aliceAddr) },
      { address: bobAddr, utxo: await findPaymentUTXO(bobAddr) },
      { address: samAddr, utxo: await findPaymentUTXO(samAddr) }
    ]
    fs.writeFileSync('combined_inputs.json', JSON.stringify(combinedInputs, null, 2))
    console.log('combined_inputs.json written successfully.')
  } catch (err) {
    console.error(`Error in generateSupportTxs(): ${err}`)
    throw err
  }
}
combineInputs()
