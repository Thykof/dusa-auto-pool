import {
  Client,
  EOperationStatus,
  fromMAS,
  IAccount,
  IBaseAccount,
  ProviderType,
  PublicApiClient,
  WalletClient,
  Web3Account,
} from '@massalabs/massa-web3';

export const getClient = async (
  secretKey: string,
): Promise<{
  client: Client;
  account: IAccount;
  baseAccount: IBaseAccount;
  chainId: bigint;
}> => {
  const account = await WalletClient.getAccountFromSecretKey(secretKey);

  const clientConfig = {
    retryStrategyOn: true,
    providers: [
      { url: process.env.JSON_RPC_URL_PUBLIC!, type: ProviderType.PUBLIC },
    ],
    periodOffset: 9,
  };

  const publicApi = new PublicApiClient(clientConfig);
  const status = await publicApi.getNodeStatus();

  const web3account = new Web3Account(account, publicApi, status.chain_id);
  const client = new Client(clientConfig, web3account, publicApi);

  return {
    client,
    account,
    baseAccount: client.wallet().getBaseAccount()!,
    chainId: status.chain_id,
  };
};

export async function waitOp(
  client: Client,
  operationId: string,
  untilFinal = true,
) {
  const status = await client
    .smartContracts()
    .awaitMultipleRequiredOperationStatus(
      operationId,
      [
        EOperationStatus.SPECULATIVE_ERROR,
        EOperationStatus.SPECULATIVE_SUCCESS,
      ],
      230_000,
    );

  const events = await client.smartContracts().getFilteredScOutputEvents({
    start: null,
    end: null,
    original_caller_address: null,
    original_operation_id: operationId,
    emitter_address: null,
    is_final: null,
  });

  if (!untilFinal) return { status, events };

  await client
    .smartContracts()
    .awaitMultipleRequiredOperationStatus(
      operationId,
      [EOperationStatus.FINAL_ERROR, EOperationStatus.FINAL_SUCCESS],
      180_000,
    );

  return {
    status,
    events,
  };
}

export async function getBalance(
  address: string,
  client: Client,
): Promise<bigint> {
  return fromMAS(
    (await client.publicApi().getAddresses([address]))[0].candidate_balance,
  );
}
