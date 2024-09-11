# %%
import bittensor
import pandas as pd
import json
import substrateinterface as pysub

from typing import List, Tuple, Optional, Dict


# %%
sub = bittensor.subtensor("wss://archive.chain.opentensor.ai:443")
BLOCK_TIME = 12

BLOCKS_PER_HOUR = 3600 / BLOCK_TIME

U16_MAX = 65535

# %%
START_BLOCK = 3_791_351 # First upgrade block
END_BLOCK = 3_804_620 # Fix block

# %%
# TODO: Fill in with ss58 addresses
HOTKEY = "YOUR HOTKEY"
OWNER_KEY = "YOUR OWNER KEY"

# %%
starting_stake = sub.query_subtensor("Stake", START_BLOCK, params=[
   HOTKEY, OWNER_KEY
]).value

# %%
curr_stake = sub.query_subtensor("Stake", END_BLOCK, params=[
    HOTKEY, OWNER_KEY
]).value

# %%
stake_since = (curr_stake - starting_stake)
print(f"total stake since: {stake_since/1e9}")

validator_take = round(sub.query_subtensor("Delegates", END_BLOCK, params=[HOTKEY]).value/U16_MAX, 5)

print(f"validator take: {validator_take}")

# %%
starting_stake_map = sub.query_map("SubtensorModule", "Stake", START_BLOCK, params=[HOTKEY])

# %%
STAKE_MAP = {}
for coldkey, stake_val in starting_stake_map:
    STAKE_MAP[coldkey.value] = stake_val.value

# %%
total_stake = sum(STAKE_MAP.values())


stake_to_distribute = stake_since * (1-validator_take)

print(f"stake to distribute: {stake_to_distribute/1e9}")
NEED_TO_EMIT = {
    coldkey: int((stake_val / total_stake) * stake_to_distribute)
    for coldkey, stake_val in STAKE_MAP.items()
}


# %%
to_emit_formatted = {
    "address": [],
    "amount": []
}
for coldkey, amount in NEED_TO_EMIT.items():
    to_emit_formatted["address"].append(coldkey)
    in_tao = round(amount/1e9, 9) # make into TAO, keep 9 decimal places
    to_emit_formatted["amount"].append(in_tao) 

# %%
assert (stake_to_distribute - sum(NEED_TO_EMIT.values())) <= 0.005e9

# %%
def to_csv(emission_map: Dict[str, int], filename: str):
    df = pd.DataFrame.from_dict(emission_map)
    df.to_csv(filename, index=False)

# %%
to_csv(to_emit_formatted, "emit_map.csv")

# %%
def to_json(emission_map: Dict[str, int], filename: str):
    with open(filename, "w") as f:
        json.dump(emission_map, f)

# %%
to_json(NEED_TO_EMIT, "emit_map.json")

print("Done.  Generated emit_map.csv and emit_map.json")


