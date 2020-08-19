/*
  Generate SELL signal transaction offering SLP UTXO for sale.
*/

// The token ID for the token for sale. Uses PSF token, but you can replace this
// with your own token.
const tokenId =
  '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'

// number of satoshis to buy 1 whole token.
const exchangeRate = 60000

const AppUtils = require('./util')
const appUtils = new AppUtils()

const fs = require('fs')

// Open the offering part wallet generated with create-wallets.
try {
  var sellerWallet = require('../create-wallets/seller-wallet.json')
} catch (err) {
  console.log(
    'Could not open seller-wallet.json. Generate wallets with create-wallets first.'
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
    // console.log(`offerTokenUtxos: ${JSON.stringify(offerTokenUtxos, null, 2)}`)

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

// Generate 'signal' JSON file.
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
      exactUtxoTxId: tokenUtxoForSale.txid, // or biggestUtxo.txid
      exactUtxoIndex: tokenUtxoForSale.vout // or biggestUtxo.vout
    }

    fs.writeFileSync('signal.json', JSON.stringify(config, null, 2))
    console.log('\nsignal.json written successfully.')
    console.log('Next, run: npm run step2')
  } catch (err) {
    console.error('Error in generatePartialTx: ', err)
    throw err
  }
}
