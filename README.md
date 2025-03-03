# TAO Restore Script

This script allows you to perform batch TAO transfers to multiple addresses using a CSV file as input.

## Prerequisites

- Python 3.x
- Required Python packages (install using `pip install -r requirements.txt`):
  - bittensor==9.0.2
  - pandas==2.2.3

## Setup

1. Create a `.env` file in the project root with the following variables:
   ```
   # Option 1: Use existing wallet by name
   WALLET_NAME="your_wallet_name"
   
   # Option 2: Use mnemonic to create/regenerate wallet
   MNEMONIC="your wallet mnemonic"
   
   # Network configuration (optional, defaults to "finney")
   SUBTENSOR_NETWORK="finney"
   ```

2. Prepare your input CSV file named `emit_map.csv` with the following columns:
   - `address`: The destination TAO address
   - `amount`: The amount of TAO to transfer

## Usage

1. Run the script using:
   ```bash
   ./main.sh
   ```

The script will:
1. Convert your CSV file to JSON format
2. Load your wallet configuration from the `.env` file
3. Execute the batch transfer of TAO to all addresses specified in your CSV file

## Output

After successful execution, the script will display:
- The execution time of each operation
- The transaction hash
- A link to view the transaction on TaoStats.io (available some time after execution)

## Notes

- The script uses the Finney network by default
- All amounts in the CSV should be in TAO (not RAO)
- The script will automatically convert TAO amounts to RAO for the transaction
- Make sure you have sufficient TAO in your wallet to cover all transfers plus transaction fees
- If neither WALLET_NAME nor MNEMONIC is provided, the script will use a default temporary wallet named "tao_restore_temp_wallet"
