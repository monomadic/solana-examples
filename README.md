# Solana Examples

Various examples of how to use solana, inspired by [SecretJS-Templates](https://github.com/enigmampc/SecretJS-Templates).

## Installation and Setup

```bash
git clone --depth=1 https://github.com/monomadic/solana-examples.git
cd solana-examples
yarn install
```

You will also need to specify some environment variables in a `.env` file in the root of this project. An example can be found at `.env.example` - if you don't have a wallet yet you can create one on devnet and airdrop it by running:

```bash
yarn airdrop
```

Copy the _private key_ (also known as secret key in solana) and supply it as `SOLANA_PRIVATE_KEY` in `.env.example`.

## Running the Examples

Run the examples with `ts-node`.

```bash
npx ts-node examples/1-basic/1-airdrop.ts
```

Some shortcut scripts are set up if you prefer:
```bash
yarn 1-1
```
