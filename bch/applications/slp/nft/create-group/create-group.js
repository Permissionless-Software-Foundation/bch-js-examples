/*
  Create a new SLP token. Requires a wallet created with the create-wallet
  example. Also requires that wallet to have a small BCH balance.
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v5/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// Open the wallet generated with create-wallet.
let walletInfo
try {
  walletInfo = require('../../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

async function createNFT () {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    // master HDNode
    const masterHDNode = bchjs.HDNode.fromSeed(rootSeed)

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")

    const change = bchjs.HDNode.derivePath(account, '0/0')

    // get the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change)
    // const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)

    // Get a UTXO to pay for the transaction.
    const utxos = await bchjs.Utxo.get(cashAddress)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // Separate UTXO types
    const bchUtxos = utxos.bchUtxos

    if (bchUtxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.')
    }

    // Get the biggest UTXO to pay for the transaction.
    const utxo = bchjs.Utxo.findBiggestUtxo(bchUtxos)
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    const originalAmount = utxo.value
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - 546 * 2 - txFee

    // Generate SLP config object
    const configObj = {
      name: 'NFT Group Test Token',
      ticker: 'NGT',
      documentUrl: 'https://FullStack.cash',
      mintBatonVout: 2,
      initialQty: 1
    }

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = bchjs.SLP.NFT1.newNFTGroupOpReturn(configObj)
    // const data = bchjs.Script.encode(script)
    // const data = compile(script)

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0)

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      546
    )

    // Send dust transaction representing minting baton.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      546
    )

    // add output to send BCH remainder of UTXO.
    transactionBuilder.addOutput(cashAddress, remainder)

    // Generate a keypair from the change address.
    const keyPair = bchjs.HDNode.toKeyPair(change)

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()
    // console.log(`TX hex: ${hex}`)
    // console.log(` `)

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])
    console.log('Check the status of your transaction on this block explorer:')
    console.log(`https://slp-explorer.salemkode.com/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in createToken: ', err)
  }
}
createNFT()

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo (utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
