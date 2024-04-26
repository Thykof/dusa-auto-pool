import { Args, bytesToU256, IClient } from '@massalabs/massa-web3';

export async function readSC(
  client: IClient,
  targetFunction: string,
  targetAddress: string,
  parameter: Array<number>,
): Promise<Uint8Array> {
  const res = await client.smartContracts().readSmartContract({
    targetAddress: targetAddress,
    targetFunction: targetFunction,
    parameter: parameter,
  });

  return res.returnValue;
}

export async function getBalance(
  targetAddress: string,
  client: IClient,
  address: string,
): Promise<bigint> {
  const args = new Args().addString(address).serialize();
  const data = await readSC(client, 'balanceOf', targetAddress, args);
  return bytesToU256(data);
}
