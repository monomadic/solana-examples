// import splToken = require('@solana/spl-token');
// import borsh = require('borsh');
import web3 = require('@solana/web3.js');

import * as metaplex from '../shared/metaplex';

const key: Uint8Array = Uint8Array.from([
	177, 170, 34, 243, 4, 208, 205, 245, 36, 40, 226, 7, 236, 15, 211, 57, 67, 24, 108, 214, 242,
	13, 28, 20, 87, 85, 57, 162, 105, 43, 109, 94, 24, 62, 221, 194, 127, 118, 169, 120, 140, 123,
	220, 166, 117, 185, 177, 85, 146, 165, 150, 182, 140, 12, 187, 150, 241, 128, 191, 35, 210, 53,
	122, 42,
]);

const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

async function doTransaction(
	instructions: web3.TransactionInstruction[],
	signers: web3.Signer[]
): Promise<string> {
	let transaction = new web3.Transaction().add(...instructions);

	return web3.sendAndConfirmTransaction(connection, transaction, signers);
}

async function main() {
	const payer = web3.Keypair.fromSecretKey(key);
	console.log(payer.publicKey.toBase58());
	console.log(await connection.getBalance(payer.publicKey));

	const { priceMint, externalPriceAccount, instructions, signers } =
		await metaplex.createExternalPriceAccount(connection, payer.publicKey);

	await doTransaction(instructions, signers);

	metaplex.createVault(connection, payer.publicKey, priceMint, externalPriceAccount);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
