/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

// Set NETWORK to either testnet or mainnet
// !!! Remember to fix NETWORK in util.js too
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

const AppUtils = require('./util')
const appUtils = new AppUtils()

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the accepting part wallet generated with create-wallets.
try {
  var walletInfo1 = require('../create-wallets/wallet-1.json')
} catch (err) {
  console.log(
    'Could not open wallet-1.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerAddr = walletInfo.cashAddress
const acceptAddr = walletInfo1.cashAddress

const offerWif = walletInfo.WIF
const acceptWif = walletInfo1.WIF

const offerSLP = bchjs.SLP.Address.toSLPAddress(offerAddr)
const acceptSLP = bchjs.SLP.Address.toSLPAddress(acceptAddr)

// Fees needed to make the exchange - in satoshis
const offerNeedSats = 1000
const acceptNeedSats = 11000

// Choose the token you want to use in exchange for BCH
const exchangeTokenId = '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1' // Honk
const exchangeRate = 600 // number of satoshis to buy one unit

// Generate partial transaction
async function generatePartialTx () {
  try {
    // Get the balance of the offering address.
    const offerBalance = await appUtils.getBCHBalance(offerAddr)
    // console.log(`balance: ${JSON.stringify(offerBalance, null, 2)}`)
    console.log(`offer:\naddr = ${offerAddr}\nslp = ${offerSLP}\nwif = ${offerWif}`)
    console.log(`balance = ${offerBalance} satoshis\n`)

    // Exit if the balance is not enough
    if (offerBalance < offerNeedSats) {
      console.log(`You need at least ${offerNeedSats} satoshis in address: ${offerAddr} to make the exchange.`)
      process.exit(0)
    }

    // Get the balance of the accepting address.
    const acceptBalance = await appUtils.getBCHBalance(acceptAddr)
    console.log(`accept:\naddr = ${acceptAddr}\nslp = ${acceptSLP}\nwif = ${acceptWif}`)
    console.log(`balance = ${acceptBalance} satoshis.\n`)

    // Exit if the balance is not enough
    if (acceptBalance < acceptNeedSats) {
      console.log(`You need at least ${acceptNeedSats} satoshis in address: ${acceptAddr} to make the exchange.`)
      process.exit(0)
    }

    // Get the tokens balance of the offering address.
    const offerTokens = await appUtils.getTokenBalance(offerSLP, exchangeTokenId)
    if (offerTokens <= 0) {
      console.log(`You must have some tokens of id=${exchangeTokenId} in the offering address ${offerSLP}`)
      process.exit(0)
    }
    console.log(`Token ID: ${exchangeTokenId}`)
    console.log(`Total available tokens to trade: ${offerTokens}`)

    // get transactions for the token
    const offerTokenUtxos = await appUtils.getTokenUtxos(offerAddr, exchangeTokenId)
    if (offerTokenUtxos.length === 0) {
      console.log(`You must have some tokens of id ${exchangeTokenId} on address ${offerAddr}`)
      process.exit(0)
    }
    // console.log(`token utxos: ${JSON.stringify(offerTokenUtxos, null, 2)}`)

    // TODO: maybe find the biggest transaction or the one with exact amount
    // const biggestUtxo = await appUtils.findBiggestUtxo(offerTokenUtxos)
    // console.log(`biggest utxo: ${JSON.stringify(biggestUtxo, null, 2)}`)

    // Prepare transaction JSON object
    const config = {
      tokenId: exchangeTokenId,
      buyOrSell: 'SELL',
      rate: exchangeRate,
      reserve: false,
      exactUtxoTxId: offerTokenUtxos[0].txid, // or biggestUtxo.txid
      exactUtxoIndex: offerTokenUtxos[0].vout, // or biggestUtxo.vout
      minSatsToExchange: 0
    }

    const msgType = 1 // exchange
    const offerSignalTx = await appUtils.uploadSignal(msgType, offerWif, config)
    console.log(`Signal Tx: ${offerSignalTx}`)
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}

generatePartialTx()
