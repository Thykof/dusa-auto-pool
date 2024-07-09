# Dusa auto pool

Join Dusa here: <https://app.dusa.io/trade?ref=qmf57z>

If you want to stake your MAS without running a node, I developed a delegated service: <https://massa-blast.net>.

If you want to stake with your own node, you can use this <https://github.com/peterjah/massa-core-docker>.

## Description

This program is a bot that adds and automatically rebalances liquidity to one or two Dusa pools: WETH-WMAS and WMAS-USDC.

The bot will start by adding 99% of your available tokens to the liquidity pool. It is designed to add all liquidity in
the center bin in order to increase the generated fees. The bot will then check every 5 minutes if the added liquidity
is out of range. In that case the bot will rebalance the liquidity by first removing it and re-adding it to the active
bin.

The bot will increase allowance to the router contract for the relevant tokens when needed.

Please note that the bot needs MAS wrapped into WMAS to work, don't forget to manually wrap the amount of MAS you want
to be available to the bot using the wrap function on Dusa.

## Parameters

You can use the environment variable `TOKEN_A_MAX` and `TOKEN_A_MAX` to set the maximum amount of tokens you want to add to the pool. Enter the amount in the lowest unit of the token.

For pool WETH-WMAS:

- token 0: Wrapped Ether, for 1WETH, enter 1000000000000000000
- token 1: Wrapped Massa, for 1WMAS, enter 1000000000

For pool WMAS-USDC:

- token 0: Wrapped Massa, for 1WMAS, enter 1000000000
- token 1: USD Coin, for 1USDC, enter 1000000

You can customize the slippage with the environment variables `ALLOWED_AMOUNT_SLIPPAGE` and `ALLOWED_PRICE_SLIPPAGE`.
Default values are 50 bips (0.5%).

## Installation

First, you need to clone the dusa-auto-pool folder from Github on your server by running the following command:

```bash
git clone https://github.com/Thykof/dusa-auto-pool.git
cd dusa-auto-pool
```

You then have to decide if you are going to run the bot on one or two of the pools available:

- WMAS-WETH
- WMAS-USDC

If you choose to run the bot on one pool, you will create a `.env` file copying the relevant template
(`.env.weth.example` or `.env.usdc.example`). If you go for two pools, you will create two files: `.env.weth` and
`.env.usdc`.

### One pool

```bash
cp .env.weth.example .env
```

### Two pools

```bash
cp .env.weth.example .env.weth
cp .env.usdc.example .env.usdc
```

You can now edit the .env file(s) adding your private key in the field WALLET_SECRET_KEY and entering the values for the
optional parameters if needed.

### Running the bot

You can now run the bot with docker or npm.

#### Docker

For one pool:

```bash
# build the bot
sudo docker compose -f docker-compose-one-pool.yml build
# run the bot
sudo docker compose -f docker-compose-one-pool.yml up -d
# check the logs
sudo docker compose -f docker-compose-one-pool.yml logs -f
# stop the bot
sudo docker compose -f docker-compose-one-pool.yml down
```

For 2 pools:

```bash
# build the bot
sudo docker compose build
# run the bot
sudo docker compose up -d
# check the logs
sudo docker compose logs -f
# stop the bot
sudo docker compose down
```

#### NodeJS

This method works only for one pool.

```bash
npm install
npm run start
```

## Updating

```bash
git pull
```

If you use docker to run the bot you need to stop and build, then run.

### **Happy Dusaing!**

## Author tips

To disable tips, change to 'true' the environment variable `DONT_SAY_THANKS_THYKOF` in `.env.weth` file.

Note: *you can't disable tips if you use the software on the mainnet. See License bellow*

Tips are 0.001% of the liquidity you add when you equilibrate your position (approximately 0.022% of your position each day).

## Disclaimer

This software is provided "as is" and without any warranty. You are responsible for your own actions.

Before using this software, you must read and accept the [LICENSE](LICENSE) file.

Before running the software, make sure:

- you read and understand the code
- you accept that your capital is at risk, and you can lose all your money
- you know that there is no guarantee of return on investment
- you must understand the fees of the swap, the fees of the pool composition and the impermanent loss
- you must understand the risks of the smart contract, the risks of the blockchain, the risks of the software

## License

See [LICENSE](LICENSE) file.

This project is under a commercial license. You can use it on the mainnet of Massa blockchain
only if you enable the author tips.

## Pool composition

Base token is X, it's to the left of the slash in the pair but to the right in the pool distribution.
Quote token is Y, it's to the right of the slash in the pair but to the left in the pool distribution.

The position can exit the active bin in both side.

When the bin id increase, we remove from pool only Y.
When the bin id decrease, we remove from pool only X.

If in your position you have only X.
It means that you buy X and sell Y, people are buying Y and selling X.
It means the price of Y increased and the price of X decreased.
It means also that the pool distribution shifted to the right.
While removing, you will collect fees of both tokens.
While adding, you will pay composition fees on X.
