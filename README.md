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

### **Happy Dusaing!**

## Author tips

To disable tips, change to 'true' the environment variable `DONT_SAY_THANKS_THYKOF` in `.env` file.

Tips are:

- 0.01 MAS the first time you add liquidity
- 0.3% of the liquidity you add when you equilibrate your position

Note: *automatic tips is a common practice for crypto-mining software, but you can disable it if you want.*

## Disclaimer

This software is provided "as is" and without any warranty. You are responsible for your own actions.

Before using this software, you must read and accept the [LICENSE](LICENSE) file.

Before running the software, make sure:

- you read and understand the code
- you accept that your capital is at risk, and you can lose all your money
- you know that there is no guarantee of return on investment
- you must understand the fees of the swap, the fees of the pool composition and the impermanent loss
- you must understand the risks of the smart contract, the risks of the blockchain, the risks of the software

## Developer

Don't hesitate to fork and submit a pool request to contribute to Massa ecosystem ;)

## License

GNU General Public License v3.0
