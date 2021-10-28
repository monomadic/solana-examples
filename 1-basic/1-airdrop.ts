import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

// create a connection on devnet (this time we won't load .env), but in future we will.
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

export function printLamports(lamports: number): string {
	return (lamports / 1e9).toLocaleString('en', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

(async () => {
	// create a keypair
	const keypair: web3.Keypair = web3.Keypair.generate();
	console.log('Public Key: ', keypair.publicKey.toBase58());
	console.log('Private Key:', base58.encode(keypair.secretKey));

	// request airdrop, sign with signers PK
	console.log('requesting airdrop...');
	let signature = await connection.requestAirdrop(
		keypair.publicKey,
		web3.LAMPORTS_PER_SOL // 10000000 Lamports in 1 SOL
	);

	await connection.confirmTransaction(signature).then(async () => {
		console.log('SOL balance: ', printLamports(await connection.getBalance(keypair.publicKey)));
	});
})();
