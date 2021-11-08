/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v4/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require('../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function getBalance () {
  try {
    // first get BCH balance
    const balance = await bchjs.Electrumx.balance(walletInfo.cashAddress)

    console.log('BCH Balance information:')
    console.log(JSON.stringify(balance, null, 2))
  } catch (err) {
    console.error('Error in getBalance: ', err)
    throw err
  }
}
getBalance()
