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
  return {
    amount0: new TokenAmount(
      token0,
      newBalanceToken0 - (newBalanceToken0 / 100n) * 1n,
    ),
    amount1: new TokenAmount(
      token1,
      newBalanceToken1 - (newBalanceToken1 / 100n) * 1n,
    ),
  };
}
