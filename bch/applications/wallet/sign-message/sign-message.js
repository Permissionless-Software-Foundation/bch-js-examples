/*
  Cryptographically sign a message with the private key.
  This signature can then be verified with the verify-signature example.
*/

const MESSAGE = 'test'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v5/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
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

async function signMessage () {
  try {
    const wif = walletInfo.WIF

    const signedMessage = bchjs.BitcoinCash.signMessageWithPrivKey(wif, MESSAGE)

    console.log(`Address: ${walletInfo.cashAddress}`)
    console.log(`Message: ${MESSAGE}`)
    console.log(`Signed message: ${signedMessage}`)
  } catch (err) {
    console.log('error: ', err)
  }
}
signMessage()
