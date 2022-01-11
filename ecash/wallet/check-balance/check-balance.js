/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

// REST API servers.
const ECASH_MAINNET = 'https://abc.fullstack.cash/v4/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js.
const bchjs = new BCHJS({ restURL: ECASH_MAINNET })

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

    // Sats
    const total = balance.balance.confirmed + balance.balance.unconfirmed

    // Convert sats to XEC.
    const xec = bchjs.eCash.toXec(total)

    console.log('XEC Balance: ', xec)
  } catch (err) {
    console.error('Error in getBalance: ', err)
    throw err
  }
}
getBalance()
