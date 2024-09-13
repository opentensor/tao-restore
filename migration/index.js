import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";
import { Keyring, encodeAddress } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";

const lite_node = "wss://main.mirror.test.opentensor.ai:443";
const provider = new WsProvider(lite_node);
const api = new ApiPromise({ provider: provider });

const emit_map = readFileSync("./emit_map_migration.json", "utf-8");
const emit_map_json = JSON.parse(emit_map);

const BATCH_MAX_SIZE = 1000;
let null_u8a = new Uint8Array(32);
const NULL_ACCOUNT = encodeAddress(null_u8a);

// TODO: Uncomment and fill in mnemonic
// const mnemonic = "your mnemonic here"

// TODO: fill with hotkey
// const HOTKEY = ""

// TODO: fill in your signer-key address
// const SIGNER_KEY = ""

// TODO: fill multisig key address
const MULTISIG_KEY = "5GeRjQYsobRWFnrbBmGe5ugme3rfnDVF69N45YtdBpUFsJG8";

// TODO: fill in multi-sig signers
const signers = [
  "5Ck5g3MaG7Ho29ZqmcTFgq8zTxmnrwxs6FR94RsCEquT6nLy",
  "5EXDoq9oXTLbvQojDkpXSVpAb1LGox9vgPzT9kVmxhehynBn",
  "5HZ2Pk4uhDi73iFrZFH3JXGp5Aa7fCXyyNkyHWBfjPCjSCcp",
];

const main = async (emit_map_json) => {
  await waitReady();

  // const wallet_key = new Keyring({ type: 'sr25519' }).addFromMnemonic(mnemonic)

  const keyring = new Keyring({ type: "sr25519" });
  const pub_key = keyring.addFromAddress(SIGNER_KEY);
  signers.forEach((signer) => {
    if (!!keyring.publicKeys.includes(signer)) {
      keyring.addFromAddress(signer);
    }
  });

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
      if (i === 0) {
        // First batch needs to have remove stake call
        let stake_balance = await api.query.subtensorModule.stake(
          HOTKEY,
          NULL_ACCOUNT
        );
        let remove_stake_call = api.tx.subtensorModule.removeStake(
          HOTKEY,
          stake_balance
        );
        batch.push(remove_stake_call);
      }

      let batch_call = api.tx.utility.batch(batch);

      let multi_sig_call = api.tx.multisig.approveAsMulti(
        signers.length, // threshold is N/N
        signers, // signers array
        null, // maybe threshold
        batch_call.hash.toHex(), // call hash
        {
          refTime: 0,
          proofSize: 0,
        }
      );

      let fee_estimate = await multi_sig_call.paymentInfo(pub_key);
      console.log("Fee Estimate: ", fee_estimate.partialFee.toHuman());

      // TODO: Choose ONE of two options, sign and send or write to file
      // const txHash = await multi_sig_call.signAndSend(wallet_key)
      // console.log(`Submitted multi approval of batch:${i} with hash ${txHash}`);

      writeFileSync(`batch_call_hash_${i}.hex`, batch_call.hash.toHex());
      writeFileSync(`batch_call_js_${i}.hex`, batch_call.toHex());

      writeFileSync(`multi_sig_call_${i}.hex`, multi_sig_call.toHex());
    }
    console.log("Total emission: ", total_emission/1e9);
  }

  console.log("Done");
};

await main(emit_map_json);

process.exit();
