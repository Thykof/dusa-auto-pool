# Dusa auto pool

Join Dusa here: <https://app.dusa.io/trade?ref=qmf57z>

If you want to stake your MAS without running a node, I developed a delegated service: <https://massa-blast.net>.

If you want to stake with your own node, you can use this <https://github.com/peterjah/massa-core-docker>.

## Description

This program is a bot that automatically balance the liquidity to the Dusa pool.

The bot will add 99% of your tokens to the liquidity pool, and check every 5 minutes if the pool is unbalanced.
If the pool is unbalanced, the bot will remove liquidity to the pool and add liquidity again to the active bin.

The bot will increase allowance to the router contract if needed.

## Parameters

You can use the environment variable `TOKEN_0_MAX` and `TOKEN_0_MAX` to set the maximum amount of tokens you want to add to the pool.

The liquidity is added on one bin to increase the fees generated.

## Installation

### One pool

With docker:

```bash
cp .env.weth.example .env
# Edit .env file: set your secret key in WALLET_SECRET_KEY
sudo docker compose -f docker-compose-one-pool.yml build
sudo docker compose -f docker-compose-one-pool.yml up -d
sudo docker compose -f docker-compose-one-pool.yml logs -f
```

With NodeJS:

```bash
cp .env.weth.example .env
# Edit .env file: set your secret key in WALLET_SECRET_KEY
npm install
npm run start
```

### 2 pools

```bash
cp .env.weth.example .env.weth
cp .env.usdc.example .env.usdc
# Edit .env file: set your secret key in WALLET_SECRET_KEY
sudo docker compose build
sudo docker compose up -d
sudo docker compose logs -f
```

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
