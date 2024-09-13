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

# %%
START_BLOCK = 3_791_351 # First upgrade block
END_BLOCK = 3_811_908 # NEW Fix block

# %%
# TODO: Fill in with ss58 addresses
# Note: this script assumes your *coldkey* was not swapped in the period between START_BLOCK and END_BLOCK
OWNER_KEY = "PUT OWNER SS58 ADDRESS HERE"

# %%
# Assume only ever ONE hotkey swap happened
owned_hotkeys_start = sub.query_subtensor("OwnedHotkeys", START_BLOCK, params=[OWNER_KEY])
owned_hotkeys_end = sub.query_subtensor("OwnedHotkeys", END_BLOCK, params=[OWNER_KEY])

# %%
all_w_pending = []
for hk in owned_hotkeys_start:
    pending_em = sub.query_subtensor("PendingdHotkeyEmission", START_BLOCK + 10, params=[hk.value])
    if pending_em:
        all_w_pending.append((hk.value, pending_em.value))

all_w_pending = sorted(all_w_pending, key=lambda x: x[1], reverse=True)
START_HOTKEY = all_w_pending[0][0]
print(f"Start hotkey: {START_HOTKEY}")

# %%
all_w_pending = []
for hk in owned_hotkeys_end:
    pending_em = sub.query_subtensor("PendingdHotkeyEmission", END_BLOCK - 120, params=[hk.value])
    if pending_em:
        all_w_pending.append((hk.value, pending_em.value))

all_w_pending = sorted(all_w_pending, key=lambda x: x[1], reverse=True)
END_HOTKEY = all_w_pending[0][0]
print(f"End hotkey: {END_HOTKEY}")

# %%
ZERO_KEY = bittensor.u8_key_to_ss58([0]*32)

# %%
 
TO_EMIT = {}
EMISSIONS = {}

for i, curr_hk in enumerate([START_HOTKEY, END_HOTKEY]):
    if i == 0 and START_HOTKEY == END_HOTKEY:
        print("Start and end hotkey are the same")
        continue

    # Do for each hotkey
    tempos = []
    curr_block = END_BLOCK
    while curr_block > START_BLOCK:
        # Get last emission drain
        last_emission_drain = sub.query_subtensor("LastHotkeyEmissionDrain", curr_block, params=[curr_hk])
        if not last_emission_drain:
            print(f"No last emission drain found at block {curr_block}")
            break

        if i == 0:
            # If the start hotkey, check for swap happened
            zero_key_stake = sub.query_subtensor("Stake", curr_block, params=[curr_hk, ZERO_KEY])
            if zero_key_stake.value > 0:
                print(f"Hotkey {curr_hk} swapped before block {curr_block}")
                # Hotkey swapped already, skip
            else:
                tempos.append(last_emission_drain.value)
                print("Adding tempo for start hotkey", last_emission_drain.value)
        else:
            tempos.append(last_emission_drain.value)

        curr_block = last_emission_drain.value - 1

        

    filtered_tempos = [t for t in tempos if t > 0]
   
    for tempo in filtered_tempos:
        pending_emission = sub.query_subtensor("PendingdHotkeyEmission", tempo - 1, params=[curr_hk])
        if not pending_emission:
            print(f"No emission found at block {tempo}")
            continue

        EMISSIONS[tempo] = pending_emission.value
        TAKE = sub.query_subtensor("Delegates", tempo - 1, params=[curr_hk])
        if not TAKE:
            print(f"No delegate found at block {tempo}")
            raise Exception("No delegate found")
        
        TAKE = TAKE.value / (2**16-1) # normalize to 1.0

        hk_take = pending_emission.value * TAKE
        to_emit_from_pending = pending_emission.value - hk_take

        # Get the stake map
        stake_map = sub.query_map_subtensor("Stake", tempo - 1, params=[curr_hk])
        if not stake_map:
            print(f"No stake map found at block {tempo}")
            raise Exception("No stake map found")
        
        stake_dict = {ck.value: st.value for ck, st in stake_map}
        
        stake_sum = sum(stake_dict.values())
        TO_EMIT_THIS_TEMPO = {}
        for ck, st in stake_dict.items():
            TO_EMIT_THIS_TEMPO[ck] = 0
            proportion = st / stake_sum
            owed_emission = proportion * to_emit_from_pending
            # Track for below assertion
            TO_EMIT_THIS_TEMPO[ck] += owed_emission
            
            if ck not in TO_EMIT:
                TO_EMIT[ck] = 0
            TO_EMIT[ck] += owed_emission
        
        # Verify that the sum of the emissions is less than the total to emit
        # Using an epsilon of 1_000 RAO
        assert sum(TO_EMIT_THIS_TEMPO.values()) <= to_emit_from_pending + 1_000


# %%

stake_to_distribute = sum(TO_EMIT.values())
emissions_since = sum(EMISSIONS.values())
owner_key_em = TO_EMIT[OWNER_KEY]
vali_take = emissions_since - stake_to_distribute

stake_to_distribute_no_owner = stake_to_distribute - owner_key_em


print(f"Total emissions earned: {emissions_since/1e9} TAO")
print(f"Validator take: {vali_take/1e9} TAO -> {vali_take/emissions_since*100:.2f}%")
print(f"Earned by owner key: {owner_key_em/1e9} TAO")
print(f"Stake to distribute (minus owner key): {stake_to_distribute_no_owner/1e9} TAO")

# %%
to_emit_formatted = {
    "address": [],
    "amount": []
}
total_in_csv = 0
for coldkey, amount in TO_EMIT.items():
    if coldkey == OWNER_KEY:
        continue # Skip owner key

    in_tao = round(amount/1e9, 9) # make into TAO, keep 9 decimal places
    total_in_csv += in_tao
    
    if in_tao == 0:
        continue # Skip coldkey if owed nothing
    to_emit_formatted["address"].append(coldkey)
    to_emit_formatted["amount"].append(in_tao) 
print(f"Total to emit recorded in CSV: {total_in_csv} TAO")

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
TO_EMIT_COPY = {k: int(round(v/1e9, 9)*1e9) for k, v in TO_EMIT.items() if k != OWNER_KEY and v > 0}

to_json(TO_EMIT_COPY, "emit_map.json")
print("Done")


