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

// Open the sellers wallet
try {
  var sellerWallet = require('../create-wallets/seller-wallet.json')
} catch (err) {
  console.log(
    'Could not open seller-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the second wallet generated with create-wallets.
try {
  var buyerWallet = require('../create-wallets/buyer-wallet.json')
} catch (err) {
  console.log(
    'Could not open buyer-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function getBalance () {
  try {
    // first get BCH balance
    const sellerBalance = await bchjs.Electrumx.balance(
      sellerWallet.cashAddress
    )
    const buyerBalance = await bchjs.Electrumx.balance(buyerWallet.cashAddress)

    const sellerTokenBalance = await bchjs.SLP.Utils.balancesForAddress(
      sellerWallet.slpAddress
    )
    const buyerTokenBalance = await bchjs.SLP.Utils.balancesForAddress(
      buyerWallet.slpAddress
    )

    console.log('BCH Balances information')
    console.log('------------------------')
    console.log('Seller\'s Wallet:')
    console.log(`${sellerWallet.cashAddress}`)
    console.log(`${sellerWallet.slpAddress}`)
    console.log(JSON.stringify(sellerBalance.balance, null, 2))
    console.log(`Token Balance: ${JSON.stringify(sellerTokenBalance, null, 2)}`)
    console.log('--')
    console.log('Buyer\'s Wallet:')
    console.log(`${buyerWallet.cashAddress}`)
    console.log(`${buyerWallet.slpAddress}`)
    console.log(JSON.stringify(buyerBalance.balance, null, 2))
    console.log(`Token Balance: ${JSON.stringify(buyerTokenBalance, null, 2)}`)
  } catch (err) {
    console.error('Error in getBalance: ', err)
    throw err
  }
}
getBalance()
