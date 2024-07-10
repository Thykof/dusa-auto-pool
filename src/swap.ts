import { Client } from '@massalabs/massa-web3';
import { getClient } from './utils';
import {
  ChainId,
  EventDecoder,
  IRouter,
  LB_ROUTER_ADDRESS,
  PairV2,
  Percent,
  RouteV2,
  SwapEvent,
  Token,
  TokenAmount,
  TradeV2,
  USDC as _USDC,
  WETH as _WETH,
  WMAS as _WMAS,
  parseUnits,
} from '@dusalabs/sdk';
import { IAccount } from '@massalabs/massa-web3';
import { config } from 'dotenv';
import { waitOp } from './utils';
config();

const CHAIN_ID = ChainId.MAINNET;

// initialize tokens
const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

// declare bases used to generate trade routes
const BASES = [WMAS, USDC, WETH];

export async function findBestTrade(
  client: Client,
  inputToken: Token,
  outputToken: Token,
  amountIn: TokenAmount,
  isExactIn = true,
) {
  // get all [Token, Token] combinations
  const allTokenPairs = PairV2.createAllTokenPairs(
    inputToken,
    outputToken,
    BASES,
  );

  // init PairV2 instances for the [Token, Token] pairs
  const allPairs = PairV2.initPairs(allTokenPairs);

  // generates all possible routes to consider
  const allRoutes = RouteV2.createAllRoutes(
    allPairs,
    inputToken,
    outputToken,
    2, // maxHops
  );

  // we trade only MRC20 tokens
  const isMasIn = false; // set to 'true' if swapping from MAS; otherwise, 'false'
  const isMasOut = false; // set to 'true' if swapping to MAS; otherwise, 'false'

  // generates all possible TradeV2 instances
  const trades = await TradeV2.getTradesExactIn(
    allRoutes,
    amountIn,
    outputToken,
    isMasIn,
    isMasOut,
    client,
    CHAIN_ID,
  );

  // chooses the best trade
  const bestTrade = TradeV2.chooseBestTrade(trades, isExactIn);
  // print useful information about the trade, such as the quote, executionPrice, fees, etc
  // console.log(bestTrade.toLog());

  // get trade fee information
  const { totalFeePct, feeAmountIn } = bestTrade.getTradeFee();
  // console.log('Total fees percentage', totalFeePct.toSignificant(6), '%');
  // console.log(
  //   `Fee: ${feeAmountIn.toSignificant(6)} ${feeAmountIn.token.symbol}`,
  // );

  return { bestTrade, totalFeePct, feeAmountIn };
}

export async function swap(
  client: Client,
  account: IAccount,
  inputToken: Token,
  outputToken: Token,
  amountIn: TokenAmount,
  isExactIn = true,
) {
  const { bestTrade } = await findBestTrade(
    client,
    inputToken,
    outputToken,
    amountIn,
    isExactIn,
  );

  // set slippage tolerance
  const userSlippageTolerance = new Percent(BigInt(50), BigInt(10000)); // 0.5%

  // set deadline for the transaction
  const currentTimeInMs = new Date().getTime();
  const deadline = currentTimeInMs + 3_600_000; // 1 hour

  // set swap options
  const swapOptions = {
    recipient: account.address!,
    allowedSlippage: userSlippageTolerance,
    deadline,
    feeOnTransfer: false, // or true
  };

  // generate swap method and parameters for contract call
  const params = bestTrade.swapCallParameters(swapOptions);

  // init router contract
  const router = new IRouter(LB_ROUTER_ADDRESS[CHAIN_ID], client);

  // execute swap
  console.log(
    `Swapping ${amountIn.toSignificant(inputToken.decimals)} ${
      inputToken.symbol
    } for ${outputToken.symbol}`,
  );
  const txId = await router.swap(params);
  console.log('txId swap', txId);
  const { status, events } = await waitOp(client, txId, false);
  console.log('status: ', status);
  let resultEvent: SwapEvent | undefined;
  events.map((l) => {
    const data = l.data;
    if (data.startsWith('SWAP:')) {
      resultEvent = EventDecoder.decodeSwap(data);
      console.log('SWAP: ', resultEvent);
    } else {
      console.log(data);
    }
  });
  return resultEvent;
}

async function main() {
  // the input token in the trade
  const inputToken = WMAS;

  // the output token in the trade
  const outputToken = WETH;

  // user string input; in this case representing 20 USDC
  const typedValueIn = '20';

  // parse user input into inputToken's decimal precision, which is 6 for USDC
  const typedValueInParsed = parseUnits(
    typedValueIn,
    inputToken.decimals,
  ).toString(); // returns 20000000

  // wrap into TokenAmount
  const amountIn = new TokenAmount(inputToken, typedValueInParsed);

  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);
  await swap(client, account, inputToken, outputToken, amountIn);
}

// await main();
