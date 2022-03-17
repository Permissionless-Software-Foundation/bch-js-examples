/*
  List the UTXOs associated with the BCH address in the wallet.
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v5/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// Open the wallet generated with create-wallet.
let walletInfo
try {
  walletInfo = require('../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function listUtxos () {
  try {
    // first get BCH balance
    const balance = await bchjs.Electrumx.utxo(walletInfo.cashAddress)

    console.log(`UTXOs associated with ${walletInfo.cashAddress}:`)
    console.log(JSON.stringify(balance, null, 2))
  } catch (err) {
    console.error('Error in listUtxos: ', err)
    throw err
  }
}
listUtxos()
