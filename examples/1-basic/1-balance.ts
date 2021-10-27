import { Connection, PublicKey } from '@solana/web3.js';

require('dotenv').config();

const cluster: string = process.env.SOLANA_CLUSTER_URL || 'https://api.devnet.solana.com';

// use your wallet pubkey
const pk = new PublicKey('4DQpzL1SCiutXjhCzGDCwcgShYxFKVxw13RZSvWKBqaa');

function printLamports(lamports: number): string {
	return (lamports / 1e9).toLocaleString('en', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

(async () => {
	const connection = new Connection(cluster, 'confirmed');
	const balance = await connection.getBalance(pk);

	console.log('SOL Balance: ', printLamports(balance));
})();
