/*
  Generate SELL signal transaction offering UTXO for sale
  it can contain SLP tokens etc. most important output: utxo id and pos
*/

// !!! choose UTXO from for_sale.json
const exchangeTokenTxId = '------- CHANGE THIS -------'
const exchangeRate = 600 // number of satoshis to buy one unit

// Set NETWORK to either testnet or mainnet
// !!! Remember to fix NETWORK in util.js too
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

const AppUtils = require('./util')
const appUtils = new AppUtils()

const fs = require('fs')

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerAddr = walletInfo.cashAddress
const offerSLP = bchjs.SLP.Address.toSLPAddress(offerAddr)

// Generate signal transaction
async function generateSignalTx () {
  try {
    console.log(`seller:\naddr = ${offerAddr}\nslp = ${offerSLP}`)

    // UTXO with  all token information included
    const offeredUTXO = await appUtils.getUtxoDetails(offerAddr, exchangeTokenTxId)
    // console.log(`offered UTXO: ${JSON.stringify(offeredUTXO, null, 2)}`)

    const exchangeTokenId = offeredUTXO.tokenId
    console.log(`\nfor sale:\ntokenId = ${exchangeTokenId} (${offeredUTXO.tokenTicker})`)
    console.log(`amount = ${offeredUTXO.tokenQty}`)
    console.log(`per token = ${exchangeRate} satoshis`)
    console.log(`total = ${exchangeRate * offeredUTXO.tokenQty} satoshis`)

    // Prepare transaction JSON object
    const config = {
      tokenId: exchangeTokenId,
      buyOrSell: 'SELL',
      rate: exchangeRate,
      reserve: false,
      exactUtxoTxId: offeredUTXO.txid, // or biggestUtxo.txid
      exactUtxoIndex: offeredUTXO.vout, // or biggestUtxo.vout
      minSatsToExchange: 0
    }

    config.timestamp = 'unconfirmed'
    config.URI = `swap:${offeredUTXO.txid}`
    fs.writeFile('signal.json', JSON.stringify(config, null, 2), function (err) {
      if (err) return console.error(err)
      console.log('signal.json written successfully.')
    })
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}
generateSignalTx()
