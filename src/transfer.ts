import { Token } from '@dusalabs/sdk';
import { Args, Client } from '@massalabs/massa-web3';
import { config } from 'dotenv';
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
  console.log(`Sending ${amount} ${token.symbol} to Thykof, op id ${opId}`);
}

export async function thankYouThykofMAS(client: Client, amount: bigint) {
  if (process.env.DONT_SAY_THANKS_THYKOF === 'true') {
    console.log('Thykof is not getting thanked :(');
    return;
  }

  console.log('Thank you Thykof! <3');
  const opId = await client.wallet().sendTransaction({
    fee: await client.publicApi().getMinimalFees(),
    recipientAddress: thykofAddress,
    amount,
  });
  console.log(`Sending ${amount} nanoMAS to Thykof, op id ${opId}`);
}
