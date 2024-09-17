import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";
import { Keyring, encodeAddress } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";
import { createKeyMulti, sortAddresses } from "@polkadot/util-crypto";

const lite_node = "wss://lite.chain.opentensor.ai:443";
const provider = new WsProvider(lite_node);
const api = new ApiPromise({ provider: provider });

const emit_map = readFileSync("./emit_map_migration.json", "utf-8");
const emit_map_json = JSON.parse(emit_map);

const BATCH_MAX_SIZE = 1024;
// TODO: Uncomment and fill in mnemonic
// const mnemonic = "your mnemonic here"

// TODO: fill with hotkey
// const HOTKEY = ""

// TODO: fill in your signer-key address
const SIGNER_KEY = "5Ck5g3MaG7Ho29ZqmcTFgq8zTxmnrwxs6FR94RsCEquT6nLy";

// TODO: fill multisig key address
const MULTISIG_KEY = "5GeRjQYsobRWFnrbBmGe5ugme3rfnDVF69N45YtdBpUFsJG8";

const main = async (emit_map_json) => {
  await waitReady();

  // Address as a byte array.

  const wallet_key = new Keyring({ type: "sr25519" }).addFromMnemonic(mnemonic);

  const keyring = new Keyring({ type: "sr25519" });
  const pub_key = keyring.addFromAddress(SIGNER_KEY);

  await api.isReady;

  let total_emission = 0;

  let batches = [];
  let batch_calls = [];
  let curr_batch_size = 0;
  console.log("Creating batches of calls");
  console.log("Emit map size: ", Object.keys(emit_map_json).length);
  Object.keys(emit_map_json).forEach(async (key) => {
    if (curr_batch_size >= BATCH_MAX_SIZE) {
      // Batch into BATCH_MAX_SIZE txs for block size reduction
      batches.push(batch_calls);
      batch_calls = [];
      curr_batch_size = 0;
    }

    let to_emit = emit_map_json[key];
    let tx = api.tx.balances.transferKeepAlive(key, to_emit);
    total_emission += to_emit;
    batch_calls.push(tx);
    curr_batch_size += 1;
  });

  if (curr_batch_size > 0) {
    // Add the last batch
    batches.push(batch_calls);
  }

  if (batches.length > 0) {
    console.log("Creating batch calls");
    for (const [i, batch] of batches.entries()) {
      let batch_call = api.tx.utility.batch(batch);

      let proxy_call = api.tx.proxy.proxy(
        MULTISIG_KEY, // real
        null, // forceProxyType
        batch_call // call
      );

      let fee_estimate = await proxy_call.paymentInfo(pub_key);
      console.log("Fee Estimate: ", fee_estimate.partialFee.toHuman());

      // TODO: Choose ONE of two options, sign and send or write to file
      const unsub = await proxy_call
        .signAndSend(wallet_key, (result) => {
          console.log(`Current status is ${result.status}`);

          if (result.status.isInBlock) {
            console.log(
              `Proxy Transaction:${i} included at blockHash ${result.status.asInBlock}`
            );
          } else if (result.status.isFinalized) {
            console.log(
              `Transaction:${i} finalized at blockHash ${result.status.asFinalized}`
            );
            unsub();
          }
        });

      //writeFileSync(`batch_call_hash_${i}.hex`, batch_call.hash.toHex());
      //writeFileSync(`batch_call_js_${i}.hex`, batch_call.toHex());

      writeFileSync(`proxy_call_${i}.hex`, proxy_call.toHex());
    }
    console.log("Total emission: ", total_emission / 1e9);
  }

  console.log("Done");
};

await main(emit_map_json);

process.exit();
