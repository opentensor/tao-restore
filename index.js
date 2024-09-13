import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";
import { Keyring } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";

const lite_node = "wss://lite.chain.opentensor.ai:443";
const provider = new WsProvider(lite_node);
const api = new ApiPromise({ provider: provider });

const emit_map = readFileSync("emit_map.json", "utf-8");
const emit_map_json = JSON.parse(emit_map);

// TODO: Uncomment and fill in mnemonic
// const mnemonic = "your mnemonic here"

// TODO: fill in your owner-key address
// const OWNER_KEY = "your owner key here"

const main = async (emit_map_json) => {
  await waitReady();

  // const wallet_key = new Keyring({ type: 'sr25519' }).addFromMnemonic(mnemonic)

  const pub_key = new Keyring({ type: "sr25519" }).addFromAddress(OWNER_KEY);

  await api.isReady;

  let batches = [];
  let batch_calls = [];
  let curr_batch_size = 0;
  console.log("Creating batches of calls");
  Object.keys(emit_map_json).forEach(async (key) => {
    if (curr_batch_size >= 1000) {
      // Batch into 1000 txs for block size reduction
      batches.push(batch_calls);
      batch_calls = [];
      curr_batch_size = 0;
    }

    let to_emit = emit_map_json[key];
    let tx = api.tx.balances.transferKeepAlive(key, to_emit);
    batch_calls.push(tx);
    curr_batch_size += 1;
  });

  if (curr_batch_size > 0) { // Add the last batch
    batches.push(batch_calls);
  }

  if (batches.length > 0) {
    console.log("Creating batch calls");
    for (const [i, batch] of batches.entries()) {
      let batch_call = api.tx.utility.batch(batch);
      let fee_estimate = await batch_call.paymentInfo(pub_key);

      console.log("Fee Estimate: ", fee_estimate.partialFee.toHuman());

      // TODO: Choose ONE of two options, sign and send or write to file
      // const txHash = await batch_call.signAndSend(wallet_key)
      // console.log(`Submitted batch:${i} with hash ${txHash}`);

      // writeFileSync(`batch_call_js_${i}.hex`, batch_call.toHex());
    }
  }

  console.log("Done");
};

await main(emit_map_json);

process.exit();
