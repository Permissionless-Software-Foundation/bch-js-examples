/*
  Upload a JavaScript Object as a JSON text file, to IPFS.
*/

// Add whatever data you want to this Object. It will be converted to a JSON
// string and uploaded to IPFS.
const OBJECT = {
  name: 'Bob Smith',
  subject: 'FullStack.cash rocks!',
  message: 'I really want to express how cool I think FullStack.cash is!'
}

const fs = require('fs')

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

// Get the balance of the wallet.
async function uploadObject () {
  try {
    // Write the object to a temporary file.
    await writeObject(OBJECT)

    // Request a BCH address and amount of BCH to pay for hosting the file.
    const fileModel = await bchjs.IPFS.createFileModel('./tempJSONObj.json')
    // console.log(`fileModel: ${JSON.stringify(fileModel, null, 2)}`);

    // This file ID is used to identify the file we're about to upload.
    const fileId = fileModel.file._id
    console.log(`ID for your file: ${fileId}`)

    // Upload the actual file, include the ID assigned to it by the server.
    await bchjs.IPFS.uploadFile('./tempJSONObj.json', fileId)
    // console.log(`fileObj: ${JSON.stringify(fileObj, null, 2)}`);

    console.log(
      `Pay ${fileModel.hostingCostBCH} BCH to ${
        fileModel.file.bchAddr
      } and your file will be uploaded to IPFS for 1 month.`
    )
  } catch (err) {
    console.error('Error in uploadFile: ', err)
    throw err
  }
}

// Write state to the state.json file.
function writeObject (obj) {
  return new Promise(function (resolve, reject) {
    try {
      const fileStr = JSON.stringify(obj, null, 2)

      fs.writeFile('./tempJSONObj.json', fileStr, function (err) {
        if (err) {
          console.error('Error while trying to write tempJSONObj.json file.')
          return reject(err)
        } else {
          // console.log(`${fileName} written successfully!`)
          return resolve(true)
        }
      })
    } catch (err) {
      console.error(
        'Error trying to write out tempJSONObj.json file in writeObject.'
      )
      return reject(err)
    }
  })
}

uploadObject()
