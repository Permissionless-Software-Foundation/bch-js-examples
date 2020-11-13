/*
  Check the balance of the Buyer and Seller wallets.
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// Open the Alice's wallet
try {
  var aliceWallet = require('../create-wallets/alice-wallet.json')
} catch (err) {
  console.log(
    'Could not open alice-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the second wallet generated with create-wallets.
try {
  var bobWallet = require('../create-wallets/bob-wallet.json')
} catch (err) {
  console.log(
    'Could not open bob-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the third wallet generated with create-wallets.
try {
  var samWallet = require('../create-wallets/sam-wallet.json')
} catch (err) {
  console.log(
    'Could not open bob-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function getBalance () {
  try {
    // first get BCH balance
    const aliceBalance = await bchjs.Electrumx.balance(
      aliceWallet.cashAddress
    )
    const bobBalance = await bchjs.Electrumx.balance(bobWallet.cashAddress)
    const samBalance = await bchjs.Electrumx.balance(samWallet.cashAddress)

    console.log('BCH Balances information')
    console.log('------------------------')
    console.log('Alice\'s Wallet:')
    console.log(`${aliceWallet.cashAddress}`)
    console.log(JSON.stringify(aliceBalance.balance, null, 2))
    console.log('--')
    console.log('Bob\'s Wallet:')
    console.log(`${bobWallet.cashAddress}`)
    console.log(JSON.stringify(bobBalance.balance, null, 2))
    console.log('--')
    console.log('Sam\'s Wallet:')
    console.log(`${samWallet.cashAddress}`)
    console.log(JSON.stringify(samBalance.balance, null, 2))
  } catch (err) {
    console.error('Error in getBalance: ', err)
    throw err
  }
}
getBalance()
