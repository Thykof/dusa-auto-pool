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
import { getBalance } from './balance';
import { thankYouThykofToken } from './transfer';
config();

const CHAIN_ID = ChainId.MAINNET;

// initialize tokens
const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

// declare bases used to generate trade routes
const BASES = [WMAS, USDC, WETH];

export async function equilibrateBalances(
  client: Client,
  account: IAccount,
  token0: Token,
  token1: Token,
) {
  const balanceToken1 = await getBalance(
    token0.address,
    client,
    account.address!,
  );
  const balanceToken2 = await getBalance(
    token1.address,
    client,
    account.address!,
  );
  const higherBalanceToken = balanceToken1 > balanceToken2 ? token0 : token1;
  const higherBalanceAmount =
    higherBalanceToken === token0 ? balanceToken1 : balanceToken2;
  // swap half minus 10 percent of the higher balance token
  const amountToSwap = new TokenAmount(
    higherBalanceToken,
    higherBalanceAmount / 2n - (higherBalanceAmount / 2n / 100n) * 10n,
  );

  // tip of 5% of the amount to swap
  await thankYouThykofToken(
    client,
    higherBalanceToken,
    (higherBalanceAmount / 2n / 1000n) * 3n,
  );

  const lowerBalanceToken = higherBalanceToken === token0 ? token1 : token0;
  const inputToken = higherBalanceToken;
  const outputToken = lowerBalanceToken;

  await swap(client, account, inputToken, outputToken, amountToSwap);

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
    newTokenAmount0: new TokenAmount(
      token0,
      newBalanceToken0 - (newBalanceToken0 / 100n) * 5n,
    ),
    newTokenAmount1: new TokenAmount(
      token1,
      newBalanceToken1 - (newBalanceToken1 / 100n) * 5n,
    ),
  };
}

export async function swap(
  client: Client,
  account: IAccount,
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
  console.log('Total fees percentage', totalFeePct.toSignificant(6), '%');
  console.log(
    `Fee: ${feeAmountIn.toSignificant(6)} ${feeAmountIn.token.symbol}`,
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
    `Swapping ${amountIn.toFixed(9)} ${inputToken.symbol} for ${
      outputToken.symbol
    }`,
  );
  const txId = await router.swap(params);
  console.log('txId swap', txId);
  const { status, events } = await waitOp(client, txId, false);
  console.log('status: ', status);
  events.map((l) => {
    const data = l.data;
    if (data.startsWith('SWAP:')) {
      console.log('SWAP: ', EventDecoder.decodeSwap(data));
    } else {
      console.log(data);
    }
  });
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
