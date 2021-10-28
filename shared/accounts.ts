import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

export async function createAirdroppedAccount(): Promise<Keypair> {
	const receiverKeypair: Keypair = Keypair.generate();

	let sig = await connection.requestAirdrop(
		receiverKeypair.publicKey,
		LAMPORTS_PER_SOL // 10000000 Lamports in 1 SOL
	);

	// wait for airdrop confirmation
	await connection.confirmTransaction(sig);

	return receiverKeypair;
}
