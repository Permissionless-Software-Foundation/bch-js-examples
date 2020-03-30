/*
  Get the token information based on the id.
*/

// EDIT THIS WITH THE TOKEN ID YOU WANT TO LOOK UP
const TOKENID =
  '682d6fd95e7a7612af49823bc44b3e396eb18f47a47926cb27984f342958f37e'

// Set NETWORK to either testnet or mainnet
const NETWORK = 'testnet'

// REST API servers.
const MAINNET_API = 'https://api.fullstack.cash/v3/'
const TESTNET_API = 'http://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

async function lookupToken () {
  try {
    const properties = await bchjs.SLP.Utils.list(TOKENID)
    console.log(properties)
  } catch (err) {
    console.error('Error in getTokenInfo: ', err)
    throw err
  }
}
lookupToken()
