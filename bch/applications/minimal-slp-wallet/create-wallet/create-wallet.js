/*
  Create a new BCH wallet using minimal-slp-wallet.
*/

const BchWallet = require('minimal-slp-wallet/index')
const fs = require('fs')

async function createWallet () {
  try {
    const bchWallet = new BchWallet(undefined, {
      // Use the web 3 interface
      interface: 'consumer-api',
      // No need to wait for a checking the balance against the blockchain,
      // since this is a new wallet.
      noUpdate: true
    })
    await bchWallet.walletInfoPromise

    console.log('walletInfo: ', bchWallet.walletInfo)

    // Save the wallet info to a JSON file
    fs.writeFile('wallet.json', JSON.stringify(bchWallet.walletInfo, null, 2), function (err) {
      if (err) return console.error(err)
      console.log('wallet.json written successfully.')
    })
  } catch (err) {
    console.error('Error: ', err)
  }
}
createWallet()
