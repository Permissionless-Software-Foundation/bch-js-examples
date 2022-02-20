/*
  Verify a cryptographic signature.
  Verifies a signature produced with the sign-message example.
*/

const SIGNATURE =
  'H+Np7l5Ee/wTzpEIUYqcSDDJBu8BkOGnk/jCsZDiHzxAIu7V2rJsoisTftyF3Gx0Sk9In94GdiEX7C5xwb7ThmU='
const MESSAGE = 'This is a test message'

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

async function verifySignature () {
  try {
    const addr = walletInfo.cashAddress

    const result = bchjs.BitcoinCash.verifyMessage(addr, SIGNATURE, MESSAGE)

    console.log(`Signature is valid: ${result}`)
  } catch (err) {
    console.log('error: ', err)
  }
}
verifySignature()
