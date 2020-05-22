To run any application in the applications/ipfs directory, simply run `npm start` while in that folder directory.

Suggested order of the examples:
- [upload-file.js](./upload-file/upload-file.js) shows how to upload a generic file to IPFS.
- [upload-object.js](./upload-object/upload-object.js) shows how to upload a JavaScript object to IPFS as a JSON text file.
- [file-status.js](./file-status/file-status.js) allows you to check on the status of your file. It generally takes about 2 minutes after BCH payment is sent to get an IPFS hash for your file.
- [get-object.js](./get-object/get-object.js) will retrieve the uploaded the object from IPFS that was uploaded with the upload-object example.
