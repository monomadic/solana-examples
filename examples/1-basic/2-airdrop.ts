import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import base58 from 'bs58';

function printLamports(lamports: number): string {
	return (lamports / 1e9).toLocaleString('en', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

(async () => {
	// create a keypair
	const keypair: Keypair = Keypair.generate();
	console.log('Public Key: ', keypair.publicKey.toBase58());
	console.log('Private Key:', base58.encode(keypair.secretKey));

	// Connect to devnet cluster
	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

	// request airdrop, sign with signers PK
	console.log('requesting airdrop...');
	let signature = await connection.requestAirdrop(
		keypair.publicKey,
		LAMPORTS_PER_SOL // 10000000 Lamports in 1 SOL
	);

	await connection.confirmTransaction(signature).then(async () => {
		console.log('SOL balance: ', printLamports(await connection.getBalance(keypair.publicKey)));
	});
})();
