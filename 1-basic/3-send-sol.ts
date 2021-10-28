import { Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

const senderKeypair: Keypair = Keypair.generate();
const amount: number = 0.1;

(async () => {
	const connection = new web3.Connection(config.cluster, 'confirmed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	// Request airdrop, sign with signers PK
	console.log('requesting airdrop...');
	let airdropSignature = await connection.requestAirdrop(
		senderKeypair.publicKey,
		LAMPORTS_PER_SOL // 10000000 Lamports in 1 SOL
	);
	await connection.confirmTransaction(airdropSignature);

	// Create the transaction (instruction array)
	const transaction = new Transaction().add(
		SystemProgram.transfer({
			fromPubkey: senderKeypair.publicKey,
			toPubkey: keypair.publicKey,
			lamports: (LAMPORTS_PER_SOL / 100) * amount,
		})
	);

	// Sign transaction, broadcast, and confirm
	const signature: string = await sendAndConfirmTransaction(connection, transaction, [
		senderKeypair,
	]);

	console.log('tx signature:', signature);
})();
