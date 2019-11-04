/*
  Get the token information based on the id.
*/

// EDIT THIS WITH THE TOKEN ID YOU WANT TO LOOK UP
const TOKENID =
  "9f2b1b91a6ab0686d48e46345669889357b48dbfe8a5d817b857607d89693adc"

// Set NETWORK to either testnet or mainnet
const NETWORK = `mainnet`

// REST API servers.
const MAINNET_API = `https://mainnet.bchjs.cash/v3/`
const TESTNET_API = `http://testnet.bchjs.cash/v3/`

const BCHJS = require("../../../../src/bch-js")

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === `mainnet`) bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

async function lookupToken() {
  try {
    const properties = await bchjs.SLP.Utils.list(TOKENID)
    console.log(properties)
  } catch (err) {
    console.error(`Error in getTokenInfo: `, err)
    throw err
  }
}
lookupToken()
