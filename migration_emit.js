import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";
import { Keyring } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";

const lite_node = "wss://main.mirror.test.opentensor.ai:443";
const provider = new WsProvider(lite_node);
const api = new ApiPromise({ provider: provider });

const emit_map = readFileSync("emit_map_migration.json", "utf-8");
const emit_map_json = JSON.parse(emit_map);

const BATCH_MAX_SIZE = 1000;

// TODO: Uncomment and fill in mnemonic
// const mnemonic = "your mnemonic here"

// TODO: fill in your signer-key address
// const SIGNER_KEY = ""

// TODO: fill in multi-sig signers
// const signers = []

const main = async (emit_map_json) => {
  await waitReady();

  // const wallet_key = new Keyring({ type: 'sr25519' }).addFromMnemonic(mnemonic)

  const keyring = new Keyring({ type: "sr25519" });
  const pub_key = keyring.addFromAddress(SIGNER_KEY);
  signers.forEach((signer) => {
    if (!!keyring.getPair(signer)) {
      keyring.addFromAddress(signer);
    }
  });

  await api.isReady;

  let batches = [];
  let batch_calls = [];
  let curr_batch_size = 0;
  console.log("Creating batches of calls");
  Object.keys(emit_map_json).forEach(async (key) => {
    if (curr_batch_size >= BATCH_MAX_SIZE) {
      // Batch into BATCH_MAX_SIZE txs for block size reduction
      batches.push(batch_calls);
      batch_calls = [];
      curr_batch_size = 0;
    }

    let to_emit = emit_map_json[key];
    let tx = api.tx.balances.transferKeepAlive(key, to_emit);
    batch_calls.push(tx);
    curr_batch_size += 1;
  });

  if (batches.length > 0) {
    console.log("Creating batch calls");
    for (const [i, batch] of batches.entries()) {

      let batch_call = api.tx.utility.batch(batch);

      let multi_sig_call = api.tx.multisig.approveAsMulti(
        signers.length, // threshold is N/N
        signers, // signers array
        null, // maybe threshold
        batch_call.hash(), // call hash
        {
          "refTime": 0,
          "proofSize": 0
        }
      );

      let fee_estimate = await multi_sig_call.paymentInfo(pub_key);

      console.log("Fee Estimate: ", fee_estimate.partialFee.toHuman());

      // TODO: Choose ONE of two options, sign and send or write to file
      // const txHash = await multi_sig_call.signAndSend(wallet_key)
      // console.log(`Submitted multi approval of batch:${i} with hash ${txHash}`);

      // writeFileSync(`batch_call_hash_${i}.hex`, batch_call.hash());
      // writeFileSync(`batch_call_js_${i}.hex`, batch_call.toHex());
    }
  }

  console.log("Done");
};

await main(emit_map_json);

process.exit();
