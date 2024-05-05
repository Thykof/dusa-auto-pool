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

## Profitability optimization

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

```
/*
collected fees
X: 0.001_028_756_799_208_068 ETH (base)
Y: 18.862_156_826 MAS (quote)

composition fees
X: 0.000_313_735_272_304_771 ETH (base)
Y: 0 MAS (quote)

swap fees
X: 0.000_000_000_000_000 ETH (base)
Y: 0 MAS (quote)

*/
price increase by one bin:
FEES_COLLECTED {
  caller: 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy',
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  amountX: 136329825458304n,
  amountY: 12677833699n
}
swap:
Total fees percentage 0.15 %
Fee: 0.0000174798 WETH.e
Swapping 0.011653260 WETH.e for WMAS
txId swap O12QA1Bjx9dPES5ZobnQgRxTf39qWGDNua4A9Mtq7RGnDMsBQGgY
status:  6
TRANSFER SUCCESS
SWAP:  {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  activeId: 8381476,
  swapForY: true,
  amountInToBin: 11635780551275554n,
  amountOutOfBin: 264968492971n,
  volatilityAccumulated: 0,
  feesTotal: 0.000_017_480_516_728_316n
}
COMPOSITION_FEE:  {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381476,
  activeFeeX: 0n,
  activeFeeY: 1580936403n
}
// move again in the same side
aggregateFees {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  activeId: 8381478,
  swapForY: true,
  amountInToBin: 319983965160077n,
  amountOutOfBin: 7308509852n,
  volatilityAccumulated: 0,
  feesTotal: 480696993230n
} {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381478,
  activeFeeX: 0n,
  activeFeeY: 1658950354n
} {
  caller: 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy',
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  amountX: 0n,
  amountY: 2043598431n
}
aggregateFees {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  activeId: 8381478,
  swapForY: true,
  amountInToBin: 319983965160077n,
  amountOutOfBin: 7308509852n,
  volatilityAccumulated: 0,
  feesTotal: 480696993230n
} {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381478,
  activeFeeX: 0n,
  activeFeeY: 1658950354n
} {
  caller: 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy',
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  amountX: 0n,
  amountY: 2043598431n
}
// price decresed
txId remove liquidity O12u11xxhdDT2qkwGj8dWsVCWD1Q33XUXJMePXcNdaL27MNwRfce
FEES_COLLECTED {
  caller: 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy',
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  amountX: 692374642114815n,
  amountY: 2195653403n
}
WITHDRAWN_FROM_BIN:  {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381491,
  amountX: 510888573573552814n,
  amountY: 0n
}
Adding liquidity 506465145755264007 121197169510
txId add liquidity O1296HaHf7p1jwcQe1cASsJfPyaPWnJXPupDiE9DM32pVAg4HtWF
COMPOSITION_FEE:  {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381488,
  activeFeeX: 404699251039797n,
  activeFeeY: 0n
}
DEPOSITED_TO_BIN:  {
  to: 'AU12ScWGycW9sZNbCBq6QgJos2DpBNr6J8CLbMPNWeFFQoRiw3nqD',
  id: 8381488,
  amountX: 506060446504224210n,
  amountY: 121197169510n
}
```

If in your position you have only Y
It means that you buy Y and sell X, people are buying X and selling Y.
It means the price of X increased and the price of Y decreased.
It means also that the pool distribution shifted to the left.
While removing, you will collect fees of both tokens.
While adding, you will pay composition fees on Y.

### Calculating impermanent loss

You know the bin were you put your liquidity.

1. get the price of this bin
2. get the price of the active bin
3. get the amount you put in the pool originally
4. get the amount you have now in the pool
5. if you have only X
 a. calculate how much Y' you can have if you sell your X until you have the same amount originally.
 b. calculate the difference between Y' and Y.
