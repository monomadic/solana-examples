# Solana Examples

Various examples of how to use solana, inspired by [SecretJS-Templates](https://github.com/enigmampc/SecretJS-Templates).

```bash
yarn
npx ts-node examples/1-basic/1-balance.ts
```

Some shortcut scripts are set up if you prefer:
```bash
yarn 1-1
```

You will also need to specify some environment variables in a `.env` file in the root of this project.

A sample can be found at `.env.example` - if you don't have a wallet yet you can create one on devnet and airdrop it by running:

```bash
npx ts-node examples/1-basic/2-airdrop.ts
```

Copy the _private key_ (also known as secret key in solana) and supply it as `SOLANA_PRIVATE_KEY`.
