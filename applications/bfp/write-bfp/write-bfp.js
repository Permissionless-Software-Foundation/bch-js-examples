/*
  Write arbitrary JSON data to the blockchain using Bitcoin Files Protocol.
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

const Bfp = require('bitcoinfiles-node').bfp

let bfp
if (NETWORK === 'mainnet') bfp = new Bfp(bchjs, 'mainnet')
else bfp = new Bfp(bchjs, 'testnet')

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require('../../wallet/create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

const SEND_ADDR = walletInfo.cashAddress
// const SEND_MNEMONIC = walletInfo.mnemonic
const wif = walletInfo.WIF

async function writeBFP () {
  try {
    // Get the balance of the sending address.
    const balance = await getBCHBalance(SEND_ADDR, false)
    console.log(`balance: ${JSON.stringify(balance, null, 2)}`)
    console.log(`Balance of sending address ${SEND_ADDR} is ${balance} BCH.`)

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log('Balance of sending address is zero. Exiting.')
      process.exit(0)
    }

    const now = new Date()

    // Create an arbitrary JSON object.
    const jsonObj = {
      msg: 'This is arbitrary JSON data',
      timeStamp: now.toISOString()
    }
    console.log('\nWriting this JSON object to the blockchain: ')
    console.log(`${JSON.stringify(jsonObj, null, 2)}`)

    // Conver the JSON object into a string, and then into a Buffer (binary data).
    const jsonBuffered = Buffer.from(JSON.stringify(jsonObj))

    // Estimate upload cost for funding the transaction
    const fileSize = jsonBuffered.length
    const fileSha256Hex = bchjs.Crypto.sha256(jsonBuffered).toString('hex')
    const fileName = 'test'
    const fileExt = '.json'
    const config = {
      msgType: 1,
      chunkCount: 1,
      fileName: fileName,
      fileExt: fileExt,
      fileSize: fileSize,
      fileSha256Hex: fileSha256Hex,
      prevFileSha256Hex: null,
      fileUri: null,
      chunkData: null // chunk not needed for cost estimate stage
    }
    const uploadCost = Bfp.calculateFileUploadCost(fileSize, config)
    console.log(`\nupload cost: ${uploadCost} satoshis`)

    // Get UTXOs held by the address.
    // https://developer.bitcoin.com/mastering-bitcoin-cash/4-transactions/
    const utxos = await bchjs.Electrumx.utxo(SEND_ADDR)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`);

    if (utxos.utxos.length === 0) throw new Error('No UTXOs found.')

    // console.log(`u: ${JSON.stringify(u, null, 2)}`
    const utxo = await findBiggestUtxo(utxos.utxos)
    console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // Add needed properties to the utxo object.
    utxo.vout = utxo.tx_pos
    utxo.txid = utxo.tx_hash
    utxo.satoshis = utxo.value
    utxo.address = bchjs.Address.toLegacyAddress(SEND_ADDR)

    // Essential variables of a transaction.
    const originalAmount = utxo.value

    if (originalAmount < uploadCost) {
      throw new Error(
        `Not enough satoshis in the largest utxo (${originalAmount}) to pay the BFP fees of ${uploadCost}`
      )
    }

    // Generate a change address from a Mnemonic of a private key.
    // const change = await changeAddrFromMnemonic(SEND_MNEMONIC)

    // Upload the file to the blockchain.
    const fileId = await bfp.uploadFile(
      utxo,
      SEND_ADDR,
      wif,
      jsonBuffered,
      fileName,
      fileExt,
      null,
      null,
      SEND_ADDR,
      null,
      null,
      null,
      null
    )

    console.log(
      `The JSON has been uploaded to the blockchain with BFP file ID: ${fileId}`
    )

    console.log('There is a bug. The transaction hash is reversed.')
  } catch (err) {
    console.log('error: ', err)
  }
}
writeBFP()

// Get the balance in BCH of a BCH address.
async function getBCHBalance (addr, verbose) {
  try {
    const result = await bchjs.Electrumx.balance(addr)

    // if (verbose) console.log(result)
    console.log(result)

    // The total balance is the sum of the confirmed and unconfirmed balances.
    const satBalance =
      Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

    // Convert the satoshi balance to a BCH balance
    const bchBalance = bchjs.BitcoinCash.toBitcoinCash(satBalance)

    return bchBalance
  } catch (err) {
    console.error('Error in getBCHBalance: ', err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
async function findBiggestUtxo (utxos) {
  try {
    let largestAmount = 0
    let largestIndex = 0

    for (var i = 0; i < utxos.length; i++) {
      const thisUtxo = utxos[i]
      // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

      // Validate the UTXO data with the full node.
      const txout = await bchjs.Blockchain.getTxOut(
        thisUtxo.tx_hash,
        thisUtxo.tx_pos,
        true
      )
      // console.log(`txout: ${JSON.stringify(txout,null,2)}`)

      if (txout === null) {
        // If the UTXO has already been spent, the full node will respond with null.
        console.log(
          'Stale UTXO found. You may need to wait for the indexer to catch up.'
        )
        continue
      }

      if (thisUtxo.value > largestAmount) {
        largestAmount = thisUtxo.value
        largestIndex = i
      }
    }

    return utxos[largestIndex]
  } catch (err) {
    console.error('Error in findBiggestUtxo()')
    throw err
  }
}
