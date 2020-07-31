/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'testnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

// Generate partial transaction
try {
  console.log('step 1:')
} catch (err) {
  console.log(
    'step1 error'
  )
  process.exit(0)
}

// Get the balance of the wallet.
async function generatePartialTx () {
  try {
    console.log('Generate partial Tx and save it to JSON')
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}
generatePartialTx()
