/*
  Mint a NFT Group tokens.
*/

// EDIT THESE VALUES FOR YOUR USE.
const TOKENID =
  'ba6c400e66190baf7f101c6ea54c0ab81c7fcfa45e9a239088f2ac0a570ec0e5'
const TOKENQTY = 10 // The quantity of new tokens to mint.
// const TO_SLPADDR = '' // The address to send the new tokens.

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

async function mintNFTGroup () {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    // master HDNode
    let masterHDNode
    if (NETWORK === 'mainnet') masterHDNode = bchjs.HDNode.fromSeed(rootSeed)
    else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, 'testnet') // Testnet

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")

    const change = bchjs.HDNode.derivePath(account, '0/0')

    // get the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change)
    // const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)

    // Get a UTXO to pay for the transaction.
    const data = await bchjs.Electrumx.utxo(cashAddress)
    const utxos = data.utxos
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    if (utxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.')
    }

    // Identify the SLP token UTXOs.
    let tokenUtxos = await bchjs.SLP.Utils.tokenUtxoDetails(utxos)
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

    // Filter out the non-SLP token UTXOs.
    const bchUtxos = utxos.filter((utxo, index) => {
      const tokenUtxo = tokenUtxos[index]
      if (!tokenUtxo.isValid) return true
    })
    // console.log(`bchUTXOs: ${JSON.stringify(bchUtxos, null, 2)}`);

    if (bchUtxos.length === 0) {
      throw new Error('Wallet does not have a BCH UTXO to pay miner fees.')
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    tokenUtxos = tokenUtxos.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID && // UTXO matches the token ID.
        utxo.utxoType === 'minting-baton' && // UTXO is not a minting baton.
        utxo.tokenType === 129 // UTXO is for NFT Group
      ) { return true }
    })
    console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

    if (tokenUtxos.length === 0) {
      throw new Error('No token UTXOs for the specified token could be found.')
    }

    // Choose a UTXO to pay for the transaction.
    const utxo = findBiggestUtxo(bchUtxos)
    // console.log(`bchUtxo: ${JSON.stringify(bchUtxo, null, 2)}`);

    // instance of transaction builder
    let transactionBuilder
    if (NETWORK === 'mainnet') {
      transactionBuilder = new bchjs.TransactionBuilder()
    } else transactionBuilder = new bchjs.TransactionBuilder('testnet')

    const originalAmount = utxo.value
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // add input to pay for the transaction.
    transactionBuilder.addInput(txid, vout)

    // add the mint baton as an input.
    transactionBuilder.addInput(tokenUtxos[0].tx_hash, tokenUtxos[0].tx_pos)

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - 546 - txFee

    // Generate the SLP OP_RETURN.
    const script = bchjs.SLP.NFT1.mintNFTGroupOpReturn(tokenUtxos, TOKENQTY)

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0)

    // Send dust transaction representing the new tokens.
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

    // Sign the transaction for the UTXO input that pays for the transaction..
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // Sign the Token UTXO minting baton input
    transactionBuilder.sign(
      1,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      546
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
    if (NETWORK === 'testnet') {
      console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`)
    } else console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in mintNFTGroup: ', err)
  }
}
mintNFTGroup()

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo (utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
