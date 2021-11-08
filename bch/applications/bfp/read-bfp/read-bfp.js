/*
  Write arbitrary JSON data to the blockchain using Bitcoin Files Protocol.
*/

// Use a bitcoinfiles: hash
const bfpHash =
  'bitcoinfile:7e68134928a116aa64f1de9695cf18156db343f745baddfdabb90b66c87436e0'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v4/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

const Bfp = require('bitcoinfiles-node').bfp

const bfp = new Bfp(bchjs, 'mainnet', 'https://bchd.greyh.at:8335')

async function readBFP () {
  try {
    // Download the raw data in binary form.
    const rawData = await bfp.downloadFile(bfpHash)

    // Convert the Buffer to a string.
    const strData = rawData.fileBuf.toString()

    // Parse the string into a JSON Object.
    const jsonObj = JSON.parse(strData)
    console.log(`Original JSON object: ${JSON.stringify(jsonObj, null, 2)}`)
  } catch (err) {
    console.error(err)
  }
}
readBFP()
