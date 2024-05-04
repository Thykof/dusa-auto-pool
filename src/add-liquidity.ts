import {
  ChainId,
  IRouter,
  LB_ROUTER_ADDRESS,
  LiquidityDistribution,
  PairV2,
  TokenAmount,
  WMAS as _WMAS,
  USDC as _USDC,
  parseUnits,
  Percent,
  ILBPair,
  EventDecoder,
  LiquidityDistributionParams,
  CompositionFeeEvent,
} from '@dusalabs/sdk';
import { Client, IAccount } from '@massalabs/massa-web3';
// import { getClient } from './client';
import { getClient, waitOp } from './utils';
import { config } from 'dotenv';
import { PAIR_TO_BIN_STEP } from './dusa-utils';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];

const router = LB_ROUTER_ADDRESS[CHAIN_ID];

export async function addLiquidity(
  binStep: number,
  client: Client,
  account: IAccount,
  tokenAmount0: TokenAmount,
  tokenAmount1: TokenAmount,
  pair: PairV2,
) {
  // set amount slippage tolerance
  const allowedAmountSlippage = 50; // in bips

  // set price slippage tolerance
  const allowedPriceSlippage = 50; // in bips

  // set deadline for the transaction
  const currentTimeInMs = new Date().getTime();
  const deadline = currentTimeInMs + 3_600_000;

  const lbPair = await pair.fetchLBPair(binStep, client, CHAIN_ID);
  const lbPairData = await new ILBPair(
    lbPair.LBPair,
    client,
  ).getReservesAndId();

  const addLiquidityInput = pair.addLiquidityParameters(
    binStep,
    tokenAmount0,
    tokenAmount1,
    new Percent(BigInt(allowedAmountSlippage)),
    new Percent(BigInt(allowedPriceSlippage)),
    LiquidityDistribution.SPOT,
  );

  const customDistribution: LiquidityDistributionParams = {
    deltaIds: [0],
    distributionX: [10n ** 18n],
    distributionY: [10n ** 18n],
  };

  const params = pair.liquidityCallParameters({
    ...addLiquidityInput,
    ...customDistribution,
    activeIdDesired: lbPairData.activeId,
    to: account.address!,
    deadline,
  });

  // add liquidity
  console.log(`Adding liquidity ${tokenAmount0.raw} ${tokenAmount1.raw}`);
  const txId = await new IRouter(router, client).add(params);
  console.log('txId add liquidity', txId);
  const { status, events } = await waitOp(client, txId, false);
  console.log('status: ', status);
  let resultEvent: CompositionFeeEvent | undefined;
  events.map((l) => {
    const data = l.data;
    if (data.startsWith('COMPOSITION_FEE:')) {
      resultEvent = EventDecoder.decodeCompositionFee(data);
    } else if (data.startsWith('DEPOSITED_TO_BIN:')) {
      console.log('DEPOSITED_TO_BIN: ', EventDecoder.decodeLiquidity(data));
    } else {
      console.log(data);
    }
  });

  return resultEvent;
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  const tokenAmount1 = new TokenAmount(USDC, parseUnits('10', USDC.decimals));
  const tokenAmount2 = new TokenAmount(WMAS, parseUnits('100', WMAS.decimals));
  const pair = new PairV2(USDC, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];

  await addLiquidity(
    binStep,
    client,
    account,
    tokenAmount1,
    tokenAmount2,
    pair,
  );
}

// await main();
