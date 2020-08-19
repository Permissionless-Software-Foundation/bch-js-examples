/*
  Generate SELL signal transaction offering SLP UTXO for sale.
*/

// The token ID for the token for sale. Uses PSF token, but you can replace this
// with your own token.
const tokenId =
  '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'

const exchangeRate = 60000 // number of satoshis to buy one unit

// REST API servers.
// const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
// const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
// const BCHJS = require('@psf/bch-js')
// const bchjs = new BCHJS({ restURL: MAINNET_API_FREE })

const AppUtils = require('./util')
const appUtils = new AppUtils()

const fs = require('fs')

// Open the offering part wallet generated with create-wallets.
try {
  var sellerWallet = require('../create-wallets/seller-wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

async function runStep1 () {
  try {
    // Check that the proper UTXOs are in place before continuing.
    const tokenData = await checkSetup()

    // Exit if the token data not match what is expected.
    if (!tokenData) return

    await generateSignalTx(tokenData)
  } catch (err) {
    console.error('Error in step 1: ', err)
  }
}
runStep1()

// Check the Seller and Buyer's wallets and ensure all the UTXOs are set up correctly.
async function checkSetup () {
  try {
    const offerTokenUtxos = await appUtils.getTokenUtxos(
      sellerWallet.cashAddress,
      tokenId
    )
    console.log(`offerTokenUtxos: ${JSON.stringify(offerTokenUtxos, null, 2)}`)

    if (offerTokenUtxos[0].tokenId !== tokenId) {
      console.log(
        `Token UTXO has token ID ${
          offerTokenUtxos[0].tokenId
        } which does not match the target token ID of ${tokenId}`
      )
      return false
    }

    return offerTokenUtxos[0]
  } catch (err) {
    console.error('Error in checkSetup()')

    if (err.message === 'No UTXOs found.') {
      console.log('You need to fund the wallets before continuing.')
      return false
    } else {
      throw err
    }
  }
}

// const offerAddr = walletInfo.cashAddress
// const offerSLP = bchjs.SLP.Address.toSLPAddress(offerAddr)

// Generate signal transaction
async function generateSignalTx (tokenUtxoForSale) {
  try {
    console.log(
      `seller:\naddr = ${sellerWallet.cashAddress}\nslp = ${
        sellerWallet.slpAddress
      }`
    )

    const exchangeTokenId = tokenUtxoForSale.tokenId
    console.log(
      `\nfor sale:\ntokenId = ${exchangeTokenId} (${
        tokenUtxoForSale.tokenTicker
      })`
    )
    console.log(`amount = ${tokenUtxoForSale.tokenQty}`)
    console.log(`per token = ${exchangeRate} satoshis`)
    console.log(`total = ${exchangeRate * tokenUtxoForSale.tokenQty} satoshis`)

    // Prepare transaction JSON object
    const config = {
      tokenId: exchangeTokenId,
      buyOrSell: 'SELL',
      rate: exchangeRate,
      reserve: false,
      exactUtxoTxId: tokenUtxoForSale.txid, // or biggestUtxo.txid
      exactUtxoIndex: tokenUtxoForSale.vout, // or biggestUtxo.vout
      minSatsToExchange: 0
    }

    fs.writeFile('signal.json', JSON.stringify(config, null, 2), function (err) {
      if (err) return console.error(err)
      console.log('signal.json written successfully.')
    })
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}
// generateSignalTx()
