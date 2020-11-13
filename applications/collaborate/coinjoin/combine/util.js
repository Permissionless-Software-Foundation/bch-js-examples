const util = require('util')
util.inspect.defaultOptions = {
  showHidden: true,
  colors: true,
  depth: 1
}

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

let _this

class Util {
  constructor () {
    _this = this
    this.bchjs = bchjs
    this.util = util
  }

  // Get the balance in BCH of a BCH address.
  // assume parameters are already checked
  async getBCHBalance (addr) {
    try {
      const result = await _this.bchjs.Electrumx.balance(addr)
      // console.log(result)

      // The total balance is the sum of the confirmed and unconfirmed balances.
      const satBalance =
        Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

      // Convert the satoshi balance to a BCH balance
      // const bchBalance = _this.bchjs.BitcoinCash.toBitcoinCash(satBalance)
      // return bchBalance

      return satBalance
    } catch (err) {
      console.error('Error in getBCHBalance: ', err)
      console.log(`addr: ${addr}`)
      throw err
    }
  }

  // Get the balance in tokens of a SLP address.
  // assume parameters are already checked
  async getTokenBalance (slpAddr, tokenId) {
    try {
      // this method generate exception
      // const tokenBalance = await _this.bchjs.SLP.Utils.balance(slpAddr, tokenId)
      // using work around
      const tokens = await _this.bchjs.SLP.Utils.balancesForAddress(slpAddr)
      // console.log(JSON.stringify(tokens, null, 2))

      if (tokens === 'No balance for this address') return 0

      const tokenData = tokens.find(t => t.tokenId === tokenId)
      // console.log(JSON.stringify(tokenData, null, 2))

      if (tokenData === undefined) return 0

      return tokenData.balance
    } catch (err) {
      console.error('Error in getTokenBalance: ', err)
      console.log(`slpAddr: ${slpAddr}`)
      throw err
    }
  }

  // get 'hydrated' (with SLP details) transactions for address
  async getTokenUtxos (addr, tokenId) {
    try {
      const result = await _this.bchjs.Electrumx.utxo(addr)
      // console.log(`utxos: ${JSON.stringify(result, null, 2)}`)
      if (result.utxos.length === 0) throw new Error('No UTXOs found.')

      // hydrate utxo data with SLP details
      let tokenUtxos = await _this.bchjs.SLP.Utils.tokenUtxoDetails(result.utxos)
      // console.log(`utxos: ${JSON.stringify(tokenUtxos, null, 2)}`)
      tokenUtxos = tokenUtxos.filter(function (utxo) {
        if (utxo.tokenId === tokenId) return true
        return false
      })

      return tokenUtxos
    } catch (err) {
      console.error('Error in getTokenUtxos: ', err)
      console.log(`slpAddr: ${addr}`)
      throw err
    }
  }

  // Get hydrated UTXO information
  async getUtxoDetails (addr, txId) {
    try {
      const result = await _this.bchjs.Electrumx.utxo(addr)
      // console.log(`token utxos: ${JSON.stringify(result, null, 2)}`)
      if (result.utxos.length === 0) throw new Error('No UTXOs found.')

      // hydrate utxo data with SLP details
      let tokenUtxos = await _this.bchjs.SLP.Utils.tokenUtxoDetails(result.utxos)

      tokenUtxos = tokenUtxos.filter(function (utxo) {
        if (utxo.tx_hash === txId) return true
        return false
      })
      // console.log(`token utxos: ${JSON.stringify(tokenUtxos[0], null, 2)}`)
      return tokenUtxos[0]
    } catch (err) {
      console.error('Error in getUtxoDetails: ', err)
      console.log(`txId: ${txId}`)
      throw err
    }
  }

  // Get biggest UTXO
  // Returns the utxo with the biggest balance from an array of utxos.
  async findBiggestUtxo (utxos) {
    try {
      let largestAmount = 0
      let largestIndex = 0

      for (var i = 0; i < utxos.length; i++) {
        const thisUtxo = utxos[i]
        // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

        // Validate the UTXO data with the full node.
        const txout = await _this.bchjs.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
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
      console.error('Error in findBiggestUtxo: ', err)
      throw err
    }
  }
}

module.exports = Util
