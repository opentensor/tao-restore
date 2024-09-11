# How To
## Requirements
- nvm: https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating (optional)
- python: 3.9+

## Running
### Fill in Python script TODO's
Lines 22 and 24 of `get_emit.py` need to be filled-in with your ss58 address. Both your hotkey address and your Validator owner key address.
### Run Python script to get CSV and JSON
```
python get_emit.py
```
This will create a CSV call `emit_map.csv` with columns `address, amount` with the keys to send TAO to and the amounts to send them, formatted for import into https://taomarketcap.com/transfer (batch transfer upload).

This will *also* create a JSON file `emit_map.json` with the same mapping, but for use with a node.js script to run this call on the command-line. 

It is *your choice* which option to use.

### Option 1: Use TAOMarketCap webapp
- Your owner coldkey is required to be in a browser-based wallet (e.g. Talisman)
- You need the CSV `emit_map.csv` from earlier 
  
Go to https://taomarketcap.com/transfer , click the "swap" icon to use the batch transfer, and click the "upload" icon to load in the CSV file you just made.

The website should then prompt you to sign and send the batch call.

### Option 2: Use Node.js on the command-line
- Requires node.js (see NVM install in [requirements](#requirements) )
- Requires yarn (`npm install yarn`)

#### Install dependencies
```
yarn
```

#### Running node script

Edit `index.js` on line 13 fill in your mnemonic. Uncomment that line and line 14.
On line 17 fill in your Owner Coldkey ss58 address. 

Next, uncomment line 37 OR 39. 
The first line will send sign and send a batch transfer using your provided mnemonic.
The second will output an unsiged call to `batch_call_js.hex` for your use, should you choose this option.
