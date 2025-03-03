#!/bin/bash

# Define file paths
CSV_FILE="emit_map.csv"  # Change this to your input CSV file
JSON_FILE="emit_map.json"  # Output JSON file from the Python script
PYTHON_SCRIPT="main.py"  # Node.js script to process the TAO transfers

# Step 1: Convert CSV to JSON
echo "Converting CSV to JSON..."
python3 <<EOF
import pandas as pd
import json

def csv_to_json(input_file, output_file="emit_map.json"):
    # Read CSV file
    df = pd.read_csv(input_file)

    # Convert TAO to µTAO (RAO) by multiplying by 1,000,000,000 and converting to integer
    df['amount'] = (df['amount'] * 1_000_000_000).astype(int)

    # Create dictionary from the DataFrame
    emit_map = dict(zip(df['address'], df['amount']))

    # Write dictionary to JSON file
    with open(output_file, 'w') as json_file:
        json.dump(emit_map, json_file, indent=4)

# Usage
csv_to_json("emit_map.csv")
EOF

# Check if JSON was created successfully
if [[ ! -f "$JSON_FILE" ]]; then
    echo "Error: Failed to create JSON file from CSV."
    exit 1
fi

echo "CSV converted to JSON successfully."

# Step 2: Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    set -a  # Automatically export all variables
    source .env
    set +a  # Turn off automatic exporting
else
    echo "Error: .env file not found. Please create one with WALLET_NAME"
    exit 1
fi

# Step 3: Run the Node.js script
echo "Executing Python script for TAO transfers..."
python3 $PYTHON_SCRIPT

# Check if the Node.js script executed successfully
if [[ $? -eq 0 ]]; then
    echo "TAO transfer process completed successfully."
else
    echo "Error: Python script execution failed."
    exit 1
fi