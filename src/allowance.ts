import {
  Args,
  bytesToU256,
  Client,
  fromMAS,
  IAccount,
} from '@massalabs/massa-web3';
import { getClient, waitOp } from './utils';
import { config } from 'dotenv';
config();

const fee = 0n;
const coins = fromMAS('0');
const operatorAddress = 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy'; // Dusa Router mainnet

export async function increaseAllowanceIfNeeded(
  client: Client,
  account: IAccount,
  contractAddress: string,
  amount: bigint,
) {
  const allowance = await getAllowance(
    client,
    contractAddress,
    account.address!,
  );
  if (allowance < amount) {
    await increaseAllowance(client, contractAddress, amount);
  }
}

export async function increaseAllowance(
  client: Client,
  contractAddress: string,
  amount: bigint,
) {
  console.log(
    `Allowing ${operatorAddress} to spend ${amount} on ${contractAddress}`,
  );
  const opId = await client.smartContracts().callSmartContract({
    fee,
    coins,
    targetAddress: contractAddress,
    targetFunction: 'increaseAllowance',
    parameter: new Args().addString(operatorAddress).addU256(amount),
  });

  console.log(opId);
  await waitOp(client, opId, false);
  console.log('Allowance increased (not final)');
}

export async function decreaseAllowance(
  client: Client,
  contractAddress: string,
  amount: bigint,
) {
  console.log(
    `Decreasing allowance of ${operatorAddress} by ${amount} on ${contractAddress}`,
  );
  const opId = await client.smartContracts().callSmartContract({
    fee,
    coins,
    targetAddress: contractAddress,
    targetFunction: 'decreaseAllowance',
    parameter: new Args().addString(operatorAddress).addU256(amount),
  });

  console.log(opId);
  await waitOp(client, opId, false);
  console.log('Allowance increased (not final)');
}

export async function getAllowance(
  client: Client,
  contractAddress: string,
  ownerAddress: string,
) {
  return bytesToU256(
    (
      await client.smartContracts().readSmartContract({
        targetAddress: contractAddress,
        targetFunction: 'allowance',
        parameter: new Args()
          .addString(ownerAddress)
          .addString(operatorAddress),
        callerAddress: ownerAddress,
      })
    ).returnValue,
  );
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);
  const contractAddress =
    'AS12U4TZfNK7qoLyEERBBRDMu8nm5MKoRzPXDXans4v9wdATZedz9'; // FT WMAS mainnet

  console.log(await getAllowance(client, contractAddress, account.address!));
  await increaseAllowance(client, contractAddress, 1n);
}

// await main();
