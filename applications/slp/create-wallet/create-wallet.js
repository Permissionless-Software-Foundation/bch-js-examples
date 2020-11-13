/*
  Create an HDNode wallet using bch-js. The mnemonic from this wallet
  will be used in the other examples.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: BCHN_MAINNET })
else bchjs = new BCHJS({ restURL: TESTNET3 })

const fs = require('fs')

async function createWallet () {
  const lang = 'english'
  let outStr = ''
  const outObj = {}

  // create 128 bit BIP39 mnemonic
  const mnemonic = bchjs.Mnemonic.generate(
    128,
    bchjs.Mnemonic.wordLists()[lang]
  )
  console.log('BIP44 $BCH Wallet')
  outStr += 'BIP44 $BCH Wallet\n'
  console.log(`128 bit ${lang} BIP39 Mnemonic: `, mnemonic)
  outStr += `\n128 bit ${lang} BIP32 Mnemonic:\n${mnemonic}\n\n`
  outObj.mnemonic = mnemonic

  // root seed buffer
  const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)

  // master HDNode
  let masterHDNode
  if (NETWORK === 'mainnet') masterHDNode = bchjs.HDNode.fromSeed(rootSeed)
  else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, 'testnet') // Testnet

  // HDNode of BIP44 account
  const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")
  console.log('BIP44 Account: "m/44\'/245\'/0\'"')
  outStr += 'BIP44 Account: "m/44\'/245\'/0\'"\n'

  for (let i = 0; i < 10; i++) {
    const childNode = masterHDNode.derivePath(`m/44'/245'/0'/0/${i}`)
    console.log(
      `m/44'/245'/0'/0/${i}: ${bchjs.HDNode.toCashAddress(childNode)}`
    )
    outStr += `m/44'/245'/0'/0/${i}: ${bchjs.HDNode.toCashAddress(childNode)}\n`

    if (i === 0) {
      outObj.cashAddress = bchjs.HDNode.toCashAddress(childNode)
      outObj.slpAddress = bchjs.SLP.Address.toSLPAddress(outObj.cashAddress)
      outObj.legacyAddress = bchjs.Address.toLegacyAddress(outObj.cashAddress)
    }
  }

  // derive the first external change address HDNode which is going to spend utxo
  const change = bchjs.HDNode.derivePath(account, '0/0')

  // get the cash address
  bchjs.HDNode.toCashAddress(change)

  // Get the legacy address.

  outStr += '\n\n\n'
  fs.writeFile('wallet-info.txt', outStr, function (err) {
    if (err) return console.error(err)

    console.log('wallet-info.txt written successfully.')
  })

  // Write out the basic information into a json file for other apps to use.
  fs.writeFile('wallet.json', JSON.stringify(outObj, null, 2), function (err) {
    if (err) return console.error(err)
    console.log('wallet.json written successfully.')
  })
}
createWallet()
