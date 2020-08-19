# Sell SLP

This example shows the basics of how to construct a collaborative transaction for trustlessly selling SLP tokens. There are two parties in this example: the Seller and the Buyer. The Seller offers a SLP token UTXO for sale. The Buyer accepts the offer by constructing a partially signed transaction with that UTXO. The Buyer gives the transaction to the Seller, who checks it, and if satisfied, will sign and broadcast the final transaction. The result of the transaction is that the Seller is paid in BCH for their tokens, and the tokens are transferred to the Buyers wallet.

## Basic Workflow

Here is the basic workflow of how this trustless, token sale takes place:

- Setup:
  - Create two wallets for the Seller and Buyer.
  - Fund both with 3000 sats.
  - Fund seller with 0.1 PSF tokens. (You can buy some PSF tokens at [PSFoundation.cash](https://psfoundation.cash))

- Step 1:
  - Seller generates a 'signal' containing the SLP UTXO they are offering for sale.

- Step 2
  - Buyer accepts offer by creating an unsigned transaction.
	  - Inputs:
	    - UTXO offered by seller as an input to the transaction.
	    - a BCH UTXO input for payment and miner fees.
	  - Outputs:
	    - SLP OP_RETURN
	    - dust representing the token, sent to the Buyers address
	    - BCH payment to the Seller
	    - BCH change back to the Buyer
  - Buyer signs the second input
  - Buyer compiles the transaction using the buildIncomplete() method of the Transaction Builder.
  - Buyer sends the hex-string representation of the transaction back to the Seller.
  
- Step 3
  - Seller opens partially signed transaction and verifies it.
  - Seller signs the input for the offered SLP UTXO.
  - Seller compiles final transaction and broadcasts it.

## Running the Examples
To run through the example. Follow these instructions and run each step with `npm start` or `npm run <script>`:

- [create-wallets](./create-wallets) will create two wallets. One for the Seller and one for the Buyer. Run with `npm start`. Follow the on-screen instructions after running the script.
- [check-balances](./check-balances) can be used to ensure the wallets have the appropriate amount of sats and tokens, as per the instructions produced by create-wallets.js. Run with `npm start`.
-
