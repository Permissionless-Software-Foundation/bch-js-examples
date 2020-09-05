# Collaborative CoinJoin
The examples in this directory show how to created collaborative transaction building in order to build a [CoinJoin](https://en.bitcoin.it/wiki/CoinJoin) transaction between three parties: Alice, Bob, and Sam. They build a unsigned transaction together, then they each sign a copy of that transaction. A final, fully-signed transaction is compile from their three partially-signed copies.

The finally compilation and broadcasting of the transaction can be done by a central party. This could be a web server, or simply a randomly chosen, designated participant. For the sake of these examples, JSON files use to simulate the central party. At no point does this central party have the ability to modify the transaction or take the funds.

## Basic Workflow
Here is the basic workflow of how this trustless, CoinJoin transaction takes place:

- Setup:
  - Create three wallets: One for Alice, Bob, and Sam.
  - Fund each wallet with 3000 sats of BCH.

- Step 1: Combine Data
  - An input UTXO for each wallet is provided.
  - A CoinJoin output address for each wallet is provided.
  - A change output address for each wallet is provided.
  - The information is combined into a JSON file. This simulates the information that would normally be given to a coordination server or database.

- Step 2: Generate Transaction
  - A complete but unsigned transaction will be generated from the information in Step 1. This step could be done by a server or by a designated user. The example generates a JSON file with a hexadecimal representation of the transaction.

- Step 3: Sign Copies
  - Each user (Alice, Bob, and Sam) receive a copy of the transaction. They each sign their inputs for their copy. The output of this step is three copies of the same transaction. Each copy is partially-signed by a different user.

- Step 4: Compile and Broadcast
  - This final step combines the three partially-signed copies of the transaction into a single, fully-signed transaction. It is then broadcast to the network.

## Running the Examples
To run through the example. Follow these instructions and run each step with `npm start` or `npm run <script>`:

- [create-wallets](./create-wallets) will create three wallets. One for the Alice, Bob, and Sam. Run with `npm start`. Follow the on-screen instructions after running the script.
- [check-balances](./check-balances) can be used to ensure the wallets have the appropriate amount of sats, as per the instructions produced by create-wallets.js. Run with `npm start`.
- [step1](./combine/step1-combine-inputs.js) will check to ensure the wallets are funded correctly. If they are, it will generate a JSON file with the UTXO input data from each wallet. It will generate the `combined_inputs.json` file as output. Run with `npm run step1`.
- [step2](./combine/step2-unsigned-tx.js) will read the `combined_inputs.json` file and generate a complete but unsigned CoinJoin transaction. It will encode the transaction as a hexadecimal string and write it out to the `unsigned_tx.json` file. Run with `npm run step2`.
- [step3](./combine/step3-sign-own-tx.js) simulates Alice, Bob, and Sam each signing their own inputs in their own copy of the transaction. This step generates the `signed_tx_0.json`, `signed_tx_2.json`, `signed_tx_3.json` files as output. Run with `npm run step3`.
- [step4](./combine/step4-combine-all.js) combines the three partially signed copies of the transaction into a single, fully-signed transaction. It then broadcasts the transaction to the BCH network. This step could be done by a central server, or by any one of the players. Run with `npm run step4`.

To recover the funds in the example wallets, you can use the [send all BCH](../../wallet/send-all) example, to send the BCH in them back to your own wallet.
