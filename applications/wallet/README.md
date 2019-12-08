To run any application in the applications/wallet directory, simply enter:
"npm start"
while in that folder directory (e.g. run "npm start" while in the
applications/wallet/create-wallet directory)

## Testnet
All of the .js files in the applications/wallet directory are set to the
"mainnet" network. For wallet testing purposes, by using the testnet network,
change the following line of code in EACH AND EVERY .js file in the
applications/wallet directories:

`const NETWORK = 'mainnet'`

should be changed to:

`const NETWORK = 'testnet'`

If you wish to fund your newly created testnet wallet (following the steps above),
you can go to:
https://developer.bitcoin.com/faucets/bch
and enter your BCH testnet (tBCH) wallet address (please use the address located
in your "wallet.json" file, explained further on. You will receive a small amount
of tBCH to use for any testing purposes that you wish.
It is also good form to return any unused tBCH to the faucet, their wallet being:
bchtest:qqmd9unmhkpx4pkmr6fkrr8rm6y77vckjvqe8aey35

If you already have BCH, you can test these functions without having to change
any of the code from 'mainnet' to 'testnet within the .js files. A simple 0.005
BCH transaction is enough to fund the "wallet.json" addres for all testing
purposes.


The following are steps to follow when using these .js files


##applications/wallet/create-wallet

The first action you should perform in the application/wallet directory
should be in the "/wallet/create-wallet" directory. Run using:
"npm start"
A new "wallet-info.txt" and "wallet.json" file will be created for you.

#NOTE:
RUNNING "npm start" IN THIS DIRECTORY WILL OVERWRITE ANY OLD PREVIOUS
"wallet-info.txt" AND "wallet.json" FILES, SO BE CAREFUL NOT TO OVERWRITE
YOUR OLD ADDRESSES and/or CREATE A BACKUP COPY of the "wallet-info.txt"
and "wallet.json" files

The "wallet.json" file will contain your mnemonic seed phrase for that wallet.
the "wallet.json" file will also contain your primary BCH wallet address.
The "wallet-info.txt" goes a step further: while containing your mnemonic
seed phrase, it also contains 10 different BCH addresses you can use with your
single mnemonic. This is to allow some anonymity to your transactions
(and all 10 addresses can be restored from the single mnemonic phrase).

#NOTE:
all of the following examples use the "wallet.json" file (with the single
BCH address within) and not the full "wallet-info.txt" file of addresses.
The "wallet-info.txt" file is only an example of how to generate lots of
addresses with a single mnemonic and write them to an external file. Also
note that the first address in "wallet-info.txt" is the same address as the
"wallet.json" file.


##applications/wallet/check-balance

Once you send BCH (or tBCH) to your newly made "wallet.json" address, you can
using 'wallet/check-balance', to update your wallet with the network to
confirm that the coins sent have successfully reached your wallet. Ran by running:
"npm start"
in the 'wallet/check-balance' directory. This will show you your current balance
in your "wallet.json" file's address. Fairly simple and straightforward
application.


##applications/wallet/send-all

Once you have BCH (or tBCH) in your "wallet.json" address, you can use the function
'wallet/send-all' to send ALL of the BCH in your wallet to a single address.
Ran by running:
"npm start"
#NOTE:
the .js file is initally set up to return all BCH to the SAME WALLET IT IS
BEING SENT FROM (which will perform a similar action to wallet/consolidate-utxos,
discussed further in the README.txt)
To change the send-all address, change the .js file line from:
const RECV_ADDR = walletInfo.cashAddress
to
const RECV_ADDR = "YourBCHwalletHereInQuotes"


##applications/wallet/send-bch

Once you have BCH (or tBCH) in your "wallet.json" address, you can use the function
wallet/send-bch to send a specific amount of BCH from your "wallet.json" address
to any address of your choosing.
NOTE: the .js file has to be opened, and your receiving address has to be
changed from:
const RECV_ADDR = ``
to
const RECV_ADDR = 'YourBCHwalletHereInQuotes'
#NOTE:
the .js file is defaulted to sending 1000 satoshis. Edit this line:
const SATOSHIS_TO_SEND = 1000
to any number you wish, above 546, to change the amount of satoshis that will be
sent to the receiving address you entered above.


##applications/wallet/send-WIF

Exactly the same as the above 'wallet/send-bch' function above, except it uses
the WIF (Wallet Import Format) in place of the mnemonic in the "wallet.json"
file to send the BCH. This is just another way of signing the transaction
as proof of ownership of the wallet and containing addresses.
NOTE: the .js file has to be opened, and your receiving address has to be
changed from:
const RECV_ADDR = ``
to
const RECV_ADDR = 'YourBCHwalletHereInQuotes'
NOTE: the .js file is defaulted to sending 1000 satoshis. Edit this line:
const SATOSHIS_TO_SEND = 1000
to any number you wish, above 546 satoshis, to send that amount of satoshis
to the receiving address you entered above.


##applications/wallet/consolidate-utxos

After having multiple transactions into and out of your "wallet.json" address,
you may wish to combine all of the UTXOs into one single UTXO. This is done
using 'wallet/consolidate-utxo's, exactly similar as if you used "wallet/send-all"
to yourself in the above 'wallet/send-all' .js file. Doing this can combine
dozens of UTXOs into a single UTXO. Ran by running:
"npm start"


##applications/wallet/consolidate-dust

Similar to 'wallet/consolidate-utxos', however this .js file concerns itself
with satoshi amounts smaller than 546 satoshis (the cut-off limit for "dust").
The transaction will happen if ALL of the COMBINED UTXOs have satoshi values
individually less than 546, but if combined together, are greater than 546
satoshis. Should the total combined utxos not exceed 546 satoshis in total,
then there will be an error message of "insufficient funds".

##applications/util.js

Simple script to log to the console the transaction ID on the BCH or tBCH blockchain
either
[BCH](https://explorer.bitcoin.com/bch/tx/)
or
[tBCH](https://explorer.bitcoin.com/tbch/tx)
depending on if in the .js files above has
NETWORK = 'mainnet'
or
NETWORK = 'testnet'
