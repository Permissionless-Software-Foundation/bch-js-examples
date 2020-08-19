/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

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

// Open the first wallet generated with create-wallets.
try {
  var walletInfo = require('../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the second wallet generated with create-wallets.
try {
  var walletInfo1 = require('../create-wallets/wallet-1.json')
} catch (err) {
  console.log(
    'Could not open wallet-1.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function getBalance () {
  try {
    // first get BCH balance
    const balance = await bchjs.Electrumx.balance(walletInfo.cashAddress)
    const balance1 = await bchjs.Electrumx.balance(walletInfo1.cashAddress)

    console.log('BCH Balances information')
    console.log('------------------------')
    console.log(`First Wallet (${walletInfo.cashAddress}):`)
    console.log(JSON.stringify(balance, null, 2))
    console.log('--')
    console.log(`Second Wallet (${walletInfo1.cashAddress}):`)
    console.log(JSON.stringify(balance1, null, 2))
  } catch (err) {
    console.error('Error in getBalance: ', err)
    throw err
  }
}
getBalance()
