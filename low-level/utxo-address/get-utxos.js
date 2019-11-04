/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = `mainnet`

// REST API servers.
const MAINNET_API = `https://mainnet.bchjs.cash/v3/`
const TESTNET_API = `http://testnet.bchjs.cash/v3/`

const BCHJS = require("../../../src/bch-js")

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === `mainnet`) bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require(`../../applications/wallet/create-wallet/wallet.json`)
} catch (err) {
  console.log(
    `Could not open wallet.json. Generate a wallet with create-wallet first.`
  )
  process.exit(0)
}

const ADDR = walletInfo.cashAddress

async function getUtxos() {
  try {
    // first get BCH balance
    const utxos = await bchjs.Blockbook.utxo(ADDR)

    console.log(`UTXO information for address ${ADDR}:`)
    console.log(`result: ${JSON.stringify(utxos, null, 2)}`)
  } catch (err) {
    console.error(`Error in getUtxos: `, err)
    throw err
  }
}
getUtxos()
