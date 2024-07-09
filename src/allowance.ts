import {
  Args,
  bytesToU256,
  Client,
  fromMAS,
  IAccount,
} from '@massalabs/massa-web3';
import { getClient, waitOp } from './utils';
import { config } from 'dotenv';
import {
  Token,
  PairV2,
  TokenAmount,
  WMAS as _WMAS,
  USDC as _USDC,
  ChainId,
} from '@dusalabs/sdk';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];

const coins = fromMAS('0');
const operatorAddress = 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy'; // Dusa Router mainnet

export async function increaseAllowanceIfNeeded(
  client: Client,
  account: IAccount,
  token: Token,
  amount: bigint,
) {
  const allowance = await getAllowance(client, token.address, account.address!);
  if (allowance < amount) {
    await increaseAllowance(client, token, amount);
  }
}

export async function increaseAllowance(
  client: Client,
  token: Token,
  amount: bigint,
) {
  console.log(
    `Allowing ${operatorAddress} to spend ${new TokenAmount(
      token,
      amount,
    ).toSignificant(token.decimals)} ${token.symbol} on ${token.address}`,
  );
  const opId = await client.smartContracts().callSmartContract({
    fee: await client.publicApi().getMinimalFees(),
    coins,
    targetAddress: token.address,
    targetFunction: 'increaseAllowance',
    parameter: new Args().addString(operatorAddress).addU256(amount),
  });

  console.log(opId);
  await waitOp(client, opId, false);
  console.log('Allowance increased (not final)');
}

export async function decreaseAllowance(
  client: Client,
  token: Token,
  amount: bigint,
) {
  console.log(
    `Decreasing allowance of ${operatorAddress} by ${new TokenAmount(
      token,
      amount,
    ).toSignificant(token.decimals)} ${token.symbol} on ${token.address}`,
  );
  const opId = await client.smartContracts().callSmartContract({
    fee: await client.publicApi().getMinimalFees(),
    coins,
    targetAddress: token.address,
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
  const pair = new PairV2(USDC, WMAS);

  console.log(await getAllowance(client, contractAddress, account.address!));
  await increaseAllowance(client, pair.tokenA, 1n);
}

// await main();
