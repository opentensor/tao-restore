import asyncio
import json
import time
from os import environ

from bittensor import Wallet, AsyncSubtensor

TEMP_WALLET_NAME = "tao_restore_temp_wallet"

# Configuration and wallet initialization
WALLET_NAME = environ.get("WALLET_NAME", TEMP_WALLET_NAME)
SUBTENSOR_NETWORK = environ.get("SUBTENSOR_NETWORK", "finney")
MNEMONIC = environ.get("MNEMONIC")

wallet = Wallet(WALLET_NAME)
if WALLET_NAME == TEMP_WALLET_NAME:
    if not MNEMONIC:
        print("For using tao_restore_temp_wallet you have to provide mnemonic")
        exit(-1)

    wallet.regenerate_coldkey(mnemonic=MNEMONIC, use_password=False, overwrite=True)


def measure_time(func):
    """
    Decorator that prints the execution time of a function.
    Works for both synchronous and asynchronous functions.
    """
    if asyncio.iscoroutinefunction(func):
        async def async_wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = await func(*args, **kwargs)
            end = time.perf_counter()
            print(f"{func.__name__} executed in {end - start:.4f} seconds")
            return result

        return async_wrapper
    else:
        def sync_wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            end = time.perf_counter()
            print(f"{func.__name__} executed in {end - start:.4f} seconds")
            return result

        return sync_wrapper


@measure_time
def read_emit_map(filename: str = "emit_map.json") -> dict:
    """Reads and returns the JSON emit map from a file."""
    with open(filename, "r") as file:
        return json.load(file)


@measure_time
async def compose_calls(substrate, emit: dict):
    """
    Composes individual transfer calls using the Balances pallet.
    Returns a list of calls.
    """
    calls = []
    for dest, amount in emit.items():
        call = await substrate.compose_call(
            call_module="Balances",
            call_function="transfer_keep_alive",
            call_params={"dest": dest, "value": amount},
        )
        calls.append(call)
    return calls


@measure_time
async def compose_batch_call(substrate, calls):
    """
    Composes a batch call using the Utility pallet from the list of calls.
    """
    batch_call = await substrate.compose_call(
        call_module="Utility",
        call_function="batch",
        call_params={"calls": calls},
    )
    return batch_call


@measure_time
async def create_signed_extrinsic(substrate, batch_call, keypair):
    """
    Creates a signed extrinsic for the batch call.
    """
    extrinsic = await substrate.create_signed_extrinsic(
        call=batch_call, keypair=keypair
    )
    return extrinsic


@measure_time
async def submit_extrinsic(substrate, extrinsic):
    """
    Submits the extrinsic to the network and retrieves the extrinsic details.
    """
    receipt = await substrate.submit_extrinsic(
        extrinsic, wait_for_inclusion=True,
    )
    return receipt


@measure_time
async def print_receipt(receipt):
    """
    Prints the extrinsic hash and iterates over the triggered events
    to display detailed event information.
    """
    await receipt.retrieve_extrinsic()
    print("Hash:", receipt.extrinsic_hash)
    print("TaoStats url (available some time after the script is executed):",
          f"https://taostats.io/extrinsic/{receipt.extrinsic_hash}")


@measure_time
async def main():
    async with AsyncSubtensor(SUBTENSOR_NETWORK) as subtensor:
        substrate = subtensor.substrate

        emit = read_emit_map()  # Read the emit map synchronously
        calls = await compose_calls(substrate, emit)
        batch_call = await compose_batch_call(substrate, calls)
        extrinsic = await create_signed_extrinsic(substrate, batch_call, wallet.coldkey)
        receipt = await submit_extrinsic(substrate, extrinsic)
        await print_receipt(receipt)


if __name__ == "__main__":
    asyncio.run(main())
