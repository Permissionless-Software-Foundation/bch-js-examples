/*
  Get list of UTXO with can be sell - output to for_sell.json
  Choose one UTXO with SLP tokens to sell
*/

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

const exchangeTokenId = '1a1fd545b922c8ee4ecd89bc312904f4e3ba4cf7850141066ad3e3f281668188' // mint

// Generate signal transaction
async function utxoForSale () {
  try {
    // get transactions for the token
    const offerTokenUtxos = await appUtils.getTokenUtxos(offerAddr, exchangeTokenId)
    if (offerTokenUtxos.length === 0) {
      console.log(`You must have some tokens of id ${exchangeTokenId} on address ${offerAddr}`)
      process.exit(0)
    }
    console.log(`token utxos: ${JSON.stringify(offerTokenUtxos, null, 2)}`)

    fs.writeFile('for_sell.json', JSON.stringify(offerTokenUtxos, null, 2), function (err) {
      if (err) return console.error(err)
      console.log('for_sale.json written successfully.')
    })
  } catch (err) {
    console.error(`Error in generatePartialTx(): ${err}`)
    throw err
  }
}
utxoForSale()
