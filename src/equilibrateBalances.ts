import { Client } from '@massalabs/massa-web3';
import {
  Token,
  TokenAmount,
  USDC as _USDC,
  WETH as _WETH,
  WMAS as _WMAS,
} from '@dusalabs/sdk';
import { IAccount } from '@massalabs/massa-web3';
import { getBalance } from './balance';
import { config } from 'dotenv';
config();

const maxTokenA = process.env.TOKEN_A_MAX
  ? BigInt(process.env.TOKEN_A_MAX)
  : Infinity;
const maxTokenB = process.env.TOKEN_B_MAX
  ? BigInt(process.env.TOKEN_B_MAX)
  : Infinity;

export async function getAmountsToAdd(
  client: Client,
  account: IAccount,
  tokenA: Token,
  tokenB: Token,
) {
  const newBalanceTokenA = await getBalance(
    tokenA.address,
    client,
    account.address!,
  );
  const newBalanceTokenB = await getBalance(
    tokenB.address,
    client,
    account.address!,
  );

  let amountA = newBalanceTokenA - (newBalanceTokenA / 100n) * 1n;
  if (typeof maxTokenA === 'bigint' && maxTokenA < amountA) {
    amountA = maxTokenA;
  }
  let amountB = newBalanceTokenB - (newBalanceTokenB / 100n) * 1n;
  if (typeof maxTokenB === 'bigint' && maxTokenB < amountB) {
    amountB = maxTokenB;
  }

  return {
    amountA: new TokenAmount(tokenA, amountA),
    amountB: new TokenAmount(tokenB, amountB),
  };
}
