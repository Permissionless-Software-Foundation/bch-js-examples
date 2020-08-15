/*
  Get IPFS hash of encrypted message from a plain text transaction OP_RETURN
  Download the IPFS JSON file and decrypt the message
*/

const IPFS_GATEWAY = 'https://gateway.temporal.cloud'

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

const eccrypto = require('eccrypto-js')
const wif = require('wif')

const AppUtils = require('../util')
const appUtils = new AppUtils()

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../../create-wallets/wallet-1.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerTxId = '399fa67c2090c1d05d1b6912c89fbecd082b5b1e12a4fb79ef2f809204ead79f'
const acceptWif = walletInfo.WIF

async function receiveUTXO (txid, receiveWIF) {
  try {
    console.log(`Reading "${txid}"`)
    // Get the raw transaction data.
    const txData = await bchjs.RawTransactions.getRawTransaction(txid, true)
    // console.log(`txData: ${JSON.stringify(txData, null, 2)}`)
    // Decode the hex into normal text.
    const script = bchjs.Script.toASM(
      Buffer.from(txData.vout[0].scriptPubKey.hex, 'hex')
    ).split(' ')
    // console.log(`script: ${JSON.stringify(script, null, 2)}`)

    if (script[0] !== 'OP_RETURN') throw new Error('Not an OP_RETURN')

    const signalMsg = Buffer.from(script[2], 'hex').toString('ascii')
    console.log(`Message encoded in the OP_RETURN: ${signalMsg}`)

    // Create an EC Key Pair from the user-supplied WIF.
    const ecPair = bchjs.ECPair.fromWIF(receiveWIF)

    // Generate the public address that corresponds to this WIF.
    const receiveAddr = bchjs.ECPair.toCashAddress(ecPair)
    // console.log(`receiver: ${receiveAddr}`)

    // --------[ New in Level 2 get encrypted msg from IPFS ]--------
    const msgChunks = signalMsg.split(' ')
    if (msgChunks[0] !== 'MSG') throw new Error('Not a signal message')
    const ipfsHash = msgChunks[2]
    const result = await bchjs.IPFS.axios.get(`${IPFS_GATEWAY}/ipfs/${ipfsHash}`)
    // console.log(`ipfs JSON: ${JSON.stringify(result.data, null, 2)}`)
    if (result.data.to !== receiveAddr) throw new Error('Not for that receiver')
    const encryptedMsg = result.data.payload

    // --------[ New in Level 2 decript the message ]---------
    // Generate a private key from the WIF for decrypting the data.
    const privKeyBuf = wif.decode(receiveWIF).privateKey

    const encryptedBuf = Buffer.from(encryptedMsg, 'hex')
    // Convert the bufer into a structured object.
    const structData = appUtils.convertToEncryptStruct(encryptedBuf)
    // console.log(`structData: ${JSON.stringify(structData, null, 2)}`)
    //
    // Decrypt the data with a private key.
    const decryptedBuf = await eccrypto.decrypt(privKeyBuf, structData)
    console.log(`Decrypted message: ${decryptedBuf.toString()}`)
  } catch (err) {
    console.error('Error in readUTXO: ', err)
    process.exit(0)
  }
}
receiveUTXO(offerTxId, acceptWif)
