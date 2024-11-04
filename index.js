import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";
import { Keyring } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";

const lite_node = "wss://lite.chain.opentensor.ai:443";
const provider = new WsProvider(lite_node);
const api = new ApiPromise({ provider: provider });

// Read mnemonic and OWNER_KEY from environment variables
const mnemonic = process.env.MNEMONIC;
const OWNER_KEY = process.env.OWNER_KEY;


// Ensure both variables are set
if (!mnemonic || !OWNER_KEY) {
    console.error("Error: MNEMONIC and OWNER_KEY must be set in the environment variables.");
    process.exit(1);
}

const main = async (emit_map_json) => {
    try {
        await waitReady();

        const wallet_key = new Keyring({ type: 'sr25519' }).addFromMnemonic(mnemonic);
        const pub_key = new Keyring({ type: "sr25519" }).addFromAddress(OWNER_KEY);

        await api.isReady;

        let batches = [];
        let batch_calls = [];
        let curr_batch_size = 0;
        console.log("Creating batches of calls");

        for (const [key, to_emit] of Object.entries(emit_map_json)) {
            if (curr_batch_size >= 1000) {
                batches.push(batch_calls);
                batch_calls = [];
                curr_batch_size = 0;
            }

            let tx = api.tx.balances.transferKeepAlive(key, to_emit);
            batch_calls.push(tx);
            curr_batch_size += 1;
        }

        if (curr_batch_size > 0) {
            batches.push(batch_calls);
            writeFileSync(
                `last_batch_call_js.json`,
                JSON.stringify(batch_calls.map((tx) => tx.method.toHex()))
            );
        }

        for (const [i, batch] of batches.entries()) {
            let batch_call = api.tx.utility.batch(batch);
            let fee_estimate = await batch_call.paymentInfo(pub_key);

            console.log("Fee Estimate: ", fee_estimate.partialFee.toHuman());

//             Uncomment one option to either sign and send or write to file
             const txHash = await batch_call.signAndSend(wallet_key);
             console.log(`Submitted batch:${i} with hash ${txHash}`);

//             writeFileSync(`batch_call_js_${i}.hex`, batch_call.toHex());
        }

        console.log("Done");
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        // Ensure all connections are closed
        await api.disconnect();
        process.exit(0);  // Exit the script successfully
    }
};

// Load emit_map.json data and run main function
const emit_map_json = JSON.parse(readFileSync("emit_map.json", "utf-8"));
await main(emit_map_json);