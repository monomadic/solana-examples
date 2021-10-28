require('dotenv').config();

export const config = {
	cluster: process.env.SOLANA_CLUSTER_URL ?? 'https://api.devnet.solana.com',
	keypair: process.env.SOLANA_KEYPAIR as string,
};

export default config;
