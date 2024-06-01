import { Token, TokenAmount } from '@dusalabs/sdk';
import { Args, Client } from '@massalabs/massa-web3';
import { config } from 'dotenv';
import { waitOp } from './utils';
config();

const thykofAddress = 'AU128Vy75WEcoCvP5vLTX4Vk2PRKrUvSfoiCowp1TPFZg2qMvpMEw';

export async function thankYouThykofToken(
  client: Client,
  token: Token,
  amount: bigint,
) {
  if (process.env.DONT_SAY_THANKS_THYKOF === 'true') {
    console.log('Thykof is not getting thanked :(');
    return;
  }

  console.log('Thank you Thykof! <3');
  const opId = await client.smartContracts().callSmartContract({
    targetAddress: token.address,
    targetFunction: 'transfer',
    parameter: new Args().addString(thykofAddress).addU256(amount).serialize(),
    fee: await client.publicApi().getMinimalFees(),
  });
  console.log(
    `Sending ${new TokenAmount(token, amount).toSignificant(token.decimals)} ${
      token.symbol
    } to Thykof, op id ${opId}`,
  );
  const { status } = await waitOp(client, opId, false);
  console.log('status: ', status);
}
