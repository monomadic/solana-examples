// import splToken = require('@solana/spl-token');
// import borsh = require('borsh');
import web3 = require('@solana/web3.js');
import base58 from 'bs58';

import config from '../shared/config';
import { extendBorsh } from './borsh';

extendBorsh();

const connection = new web3.Connection(config.cluster, 'processed');

async function doTransaction(
	instructions: web3.TransactionInstruction[],
	signers: web3.Signer[]
): Promise<string> {
	let transaction = new web3.Transaction().add(...instructions);
	return web3.sendAndConfirmTransaction(connection, transaction, signers);
}

// async function createOracle()

async function main() {
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));
	console.log(keypair.publicKey.toBase58());
	console.log(await connection.getBalance(keypair.publicKey));

	// {
	// 	// create an oracle for redemption price
	// 	const { priceMint, externalPriceAccount, instructions, signers } =
	// 		await metaplex.createExternalPriceAccount(connection, payer.publicKey);
	// 	await doTransaction(instructions, [payer, ...signers]);

	// 	{
	// 		// create the vault
	// 		const { vault, instructions, signers } = await metaplex.createVault(
	// 			connection,
	// 			payer.publicKey,
	// 			priceMint,
	// 			externalPriceAccount
	// 		);
	// 		await doTransaction(instructions, [payer, ...signers]);
	// 		console.log('Vault:', vault);
	// 	}
	// }
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
