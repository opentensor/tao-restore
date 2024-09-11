# How To

Some emissions did not accumulate due to the change in emisssions schedule that was made on September 9, 2024. This page describes how a validator can restore these emissions.

## Requirements

Make sure you installed the following:

- Node Version Manager, `nvm` (**optional**): https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating
- Python: 3.9+

## Steps

A validator should execute these steps.

### Clone this repo

Clone this repo, or download it to your local computer.

### Your SS58 addresses

Fill the lines 22 and 24 of [`get_emit.py`](./get_emit.py) with your ss58 address. Both your hotkey address and your validator owner key address are required.

### Run Python script to get CSV and JSON

```
python get_emit.py
```

**CSV file**

This will create a CSV file called `emit_map.csv` with columns `address, amount` containing these details:
- The SS58 keys to send TAO to.
- The specific amounts to send to these SS58 keys.

The file is formatted for import into [https://taomarketcap.com/transfer](https://taomarketcap.com/transfer) (batch transfer upload).

**JSON file**

This will *also* create a JSON file `emit_map.json` with the same mapping, but for use with a `node.js` script to run this call on the command-line. 

**You only need to use one option**: either the CSV file option or the JSON file option. It is *your choice* which option to use. See the below instructions based on your choice.

### Option 1 (CSV file): Use TAOMarketCap webapp
- Your owner coldkey is required to be in a browser-based wallet (e.g. Talisman).
- You need the CSV `emit_map.csv` from the above **CSV file** section.
  
1. Go to [https://taomarketcap.com/transfer](https://taomarketcap.com/transfer)
2. Click the **swap** icon to use the batch transfer.
3. Click the **upload** icon to load in the `emit_map.csv` CSV file from the above **CSV file** section.

The website will then prompt you to sign and send the batch call.

### Option 2 (JSON file): Use Node.js on the command-line
- Requires node.js. See `nvm` in the above [Requirements](#requirements). **Make sure you run** `nvm install 18`.
- Requires yarn (`npm install yarn`)

#### Install dependencies

1. Make sure you cloned this repo.
2. Install dependencies by running `yarn` on the command line where you cloned this repo.

#### Run the `index.js` script

1. Add your mnemonic to line 13 of the `index.js` file. 
2. Uncomment lines 13 and 14.
3. On line 17 fill in your validator owner coldkey ss58 address.
4. Next, uncomment line 37 **or** 39. Uncomment only one of these lines, not both. The line 37 will send sign and send a batch transfer using your provided mnemonic. The line 39 will output an unsiged call to `batch_call_js.hex` for your use, should you choose this option.
5. Make sure that the `emit_map.json` file (see above steps) is located in this repo's home directory, i.e., in the `tao-restore` directory.
6. Run `yarn run start` **or** `node index.js`.

This concludes these steps.
