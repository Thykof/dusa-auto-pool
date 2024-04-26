# Dusa auto pool

```bash
cp .env.example .env
# Edit .env file: set your secret key in WALLET_SECRET_KEY
sudo docker compose build
sudo docker compose up -d
```

To disable tips, change to 'true' the environment variable `DONT_SAY_THANKS_THYKOF` in `.env` file.

Tips are:

- 0.01 MAS the first time you add liquidity
- 0.3% of the liquidity you add when you equilibrate your position
