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

const maxToken0 = process.env.TOKEN_0_MAX
  ? BigInt(process.env.TOKEN_0_MAX)
  : Infinity;
const maxToken1 = process.env.TOKEN_1_MAX
  ? BigInt(process.env.TOKEN_1_MAX)
  : Infinity;

export async function getAmountsToAdd(
  client: Client,
  account: IAccount,
  token0: Token,
  token1: Token,
) {
  const newBalanceToken0 = await getBalance(
    token0.address,
    client,
    account.address!,
  );
  const newBalanceToken1 = await getBalance(
    token1.address,
    client,
    account.address!,
  );

  let amount0 = newBalanceToken0 - (newBalanceToken0 / 100n) * 1n;
  if (typeof maxToken0 === 'bigint' && maxToken0 < amount0) {
    amount0 = maxToken0;
  }
  let amount1 = newBalanceToken1 - (newBalanceToken1 / 100n) * 1n;
  if (typeof maxToken1 === 'bigint' && maxToken1 < amount1) {
    amount1 = maxToken1;
  }

  return {
    amount0: new TokenAmount(token0, amount0),
    amount1: new TokenAmount(token1, amount1),
  };
}
