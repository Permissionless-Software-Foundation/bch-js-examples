/*
  Read plain text messages, uploaded to the BCH blockchain (OP_RETURN)
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

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

const offerTxId = 'e074afbfed74853acd070229cec394af3a0350cd7b5538741e0732febfef27ac'

async function receiveUTXO (txid) {
  try {
    console.log(`Reading "${txid}"`)
    // Get the raw transaction data.
    const txData = await bchjs.RawTransactions.getRawTransaction(txid, true)
    // console.log(`txData: ${JSON.stringify(txData, null, 2)}`)
    // Decode the hex into normal text.
    const script = bchjs.Script.toASM(
      Buffer.from(txData.vout[0].scriptPubKey.hex, 'hex')
    ).split(' ')
    // console.log(`script: ${JSON.stringify(script, null, 2)}`)

    if (script[0] !== 'OP_RETURN') throw new Error('Not an OP_RETURN')

    const msg = Buffer.from(script[2], 'hex').toString('ascii')
    console.log(`Message encoded in the OP_RETURN: ${msg}`)
  } catch (err) {
    console.error('Error in readUTXO: ', err)
    process.exit(0)
  }
}
receiveUTXO(offerTxId)
