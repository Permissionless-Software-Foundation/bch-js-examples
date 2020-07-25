/*
  Upload a file to the FullStack.cash IPFS server.
*/

// Change this path to point to the file you want to upload to IPFS.
const FILEPATH = `${__dirname}/upload-file.js`

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

// Get the balance of the wallet.
async function uploadFile () {
  try {
    // Request a BCH address and amount of BCH to pay for hosting the file.
    const fileModel = await bchjs.IPFS.createFileModel(FILEPATH)
    // console.log(`fileModel: ${JSON.stringify(fileModel, null, 2)}`);

    // This file ID is used to identify the file we're about to upload.
    const fileId = fileModel.file._id
    console.log(`ID for your file: ${fileId}`)

    // Upload the actual file, include the ID assigned to it by the server.
    await bchjs.IPFS.uploadFile(FILEPATH, fileId)
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
uploadFile()
