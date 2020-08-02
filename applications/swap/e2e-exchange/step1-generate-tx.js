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

// Choose the token you want to use in exchange for BCH
// const tokenId = '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf' // Spice

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

const OFFER_ADDR = walletInfo.cashAddress
const ACCEPT_ADDR = walletInfo1.cashAddress

const offerWif = walletInfo.WIF
const acceptWif = walletInfo1.WIF

// const offerEcpair = bchjs.ECPair.fromWIF(offerWif)
// const acceptEcpair = bchjs.ECPair.fromWIF(acceptWif)

const offerSLP = bchjs.SLP.Address.toSLPAddress(OFFER_ADDR)
const acceptSLP = bchjs.SLP.Address.toSLPAddress(ACCEPT_ADDR)

console.log(`Offer:\naddr = ${OFFER_ADDR}\nslp = ${offerSLP}\nwif = ${offerWif}\n`)
console.log(`Accept:\naddr = ${ACCEPT_ADDR}\nslp = ${acceptSLP}\nwif = ${acceptWif}\n`)

// Tax needed to make the exchange in BCH
const offerNeedBCH = bchjs.BitcoinCash.toBitcoinCash(1000)
const acceptNeedBCH = bchjs.BitcoinCash.toBitcoinCash(11000)

// Choose the token you want to use in exchange for BCH
const tokenId = '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf' // Spice

// Get the balance of the wallet.
async function generatePartialTx () {
  try {
    // Get the balance of the offering address.
    const offerBalance = await getBCHBalance(OFFER_ADDR, false)
    // console.log(`balance: ${JSON.stringify(offerBalance, null, 2)}`)
    console.log(`Balance of the offering address ${OFFER_ADDR} is ${offerBalance} BCH.`)

    // Exit if the balance is not enough
    if (offerBalance < offerNeedBCH) {
      console.log(`You need at least ${offerNeedBCH} BCH in address: ${OFFER_ADDR} to make the exchange.`)
      process.exit(0)
    }

    // Get the balance of the accepting address.
    const acceptBalance = await getBCHBalance(ACCEPT_ADDR, false)
    console.log(`Balance of the accepting address ${ACCEPT_ADDR} is ${acceptBalance} BCH.`)

    // Exit if the balance is not enough
    if (acceptBalance < acceptNeedBCH) {
      console.log(`You need at least ${acceptNeedBCH} BCH in address: ${ACCEPT_ADDR} to make the exchange.`)
      process.exit(0)
    }

    // Get the tokens balance of the offering address.
    const offerTokens = await getTokenBalance(offerSLP, false)
    console.log(`Tokens balance of the offering address ${offerSLP} is ${offerTokens}`)
    if (offerTokens <= 0) {
      console.log(`You must have some tokens of id=${tokenId} in the offering address ${offerSLP}`)
      process.exit(0)
    }

    console.log('Generate partial Tx and save it to JSON')
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}

// Get the balance in BCH of a BCH address.
async function getBCHBalance (addr, verbose) {
  try {
    const result = await bchjs.Electrumx.balance(addr)

    if (verbose) {
      console.log(result)
    }

    // The total balance is the sum of the confirmed and unconfirmed balances.
    const satBalance =
      Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

    // Convert the satoshi balance to a BCH balance
    const bchBalance = bchjs.BitcoinCash.toBitcoinCash(satBalance)

    return bchBalance
  } catch (err) {
    console.error('Error in getBCHBalance: ', err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Get the balance in tokens of a SLP address.
async function getTokenBalance (slpAddr, verbose) {
  try {
    const tokens = await bchjs.SLP.Utils.balancesForAddress(slpAddr)
    // console.log(JSON.stringify(tokens, null, 2))

    if (verbose === true) console.log(tokens)

    if (tokens === 'No balance for this address') {
      return 0
    }

    return tokens
  } catch (err) {
    console.error('Error in getTokenBalance: ', err)
    console.log(`slpAddr: ${slpAddr}`)
    throw err
  }
}

generatePartialTx()
