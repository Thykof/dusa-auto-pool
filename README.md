# Dusa auto pool

Join Dusa here: https://app.dusa.io/trade?ref=qmf57z

If you want to stake your MAS without running a node, I developed a delegated service: https://massa-blast.net.

If you want to stake with your own node, you can use this https://github.com/peterjah/massa-core-docker.

## Description

This program is a bot that automatically balance the liquidity to the Dusa pool.

You must have WMAS and WETH in a same ratio.

The bot will add 95% of your tokens to the liquidity pool, and check every 10 minutes if the pool is unbalanced.

If the pool is unbalanced, the bot will remove liquidity to the pool, swap the tokens (impermanent lost),
and add liquidity again.

The liquidity is added on one bin to increase the fees generated.

## Installation

```bash
cp .env.example .env
# Edit .env file: set your secret key in WALLET_SECRET_KEY
sudo docker compose build
sudo docker compose up -d
sudo docker compose logs -f
```

## Developer tips

To disable tips, change to 'true' the environment variable `DONT_SAY_THANKS_THYKOF` in `.env` file.

Tips are:

- 0.01 MAS the first time you add liquidity
- 0.3% of the liquidity you add when you equilibrate your position

Note: *automatic tips is a common practice for crypto-mining software, but you can disable it if you want.*

# **Happy Dusaing!**
