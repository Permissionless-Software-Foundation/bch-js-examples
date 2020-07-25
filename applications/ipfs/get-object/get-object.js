/*
  Get a JSON object that was uploaded to IPFS.
*/

// Change this to an IPFS hash of an object uploaded with the upload-object example.
const IPFS_HASH = 'QmU8k7XEF6TYT1ZqeuNkU3ofdn9uUdXsiFZ2KhKzRSVUK8'

const GATEWAY = 'https://gateway.temporal.cloud/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

// Get the balance of the wallet.
async function getObject () {
  try {
    // Use the axios library encapsulated in the IPFS class to make a general
    // http call to the IPFS gateway.
    const result = await bchjs.IPFS.axios.get(`${GATEWAY}/ipfs/${IPFS_HASH}`)

    const ipfsObject = result.data
    console.log(`IPFS object: ${JSON.stringify(ipfsObject, null, 2)}`)
  } catch (err) {
    console.error('Error in getObject: ', err)
    throw err
  }
}
getObject()
