/*
  Get the token information based on all SLP tokens in existence.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API = 'https://api.bchjs.cash/v3/'
const TESTNET_API = 'http://tapi.bchjs.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

async function listAllTokens () {
  try {
    const tokens = await bchjs.SLP.Utils.list()
    console.log(tokens)
  } catch (err) {
    console.error('Error in getTokenInfo: ', err)
    throw err
  }
}
listAllTokens()
