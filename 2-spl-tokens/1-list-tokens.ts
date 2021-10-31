import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	/*
		here we use getTokenAccountsByOwner() to retrieve associated token accounts,
		but we can do this manually by calling getProgramAccounts() and filtering for
		a datasize of 165 bytes and comparing the owner offset (32 bytes in) with the
		desired owner program id.
	*/

	await connection
		.getParsedTokenAccountsByOwner(keypair.publicKey, {
			programId: splToken.TOKEN_PROGRAM_ID,
		})
		.then((response) => {
			console.log(
				'Found %i tokens for address: %s\n',
				response.value.length,
				keypair.publicKey.toBase58()
			);
			response.value.forEach((token) => {
				const amount = token.account.data.parsed.info.tokenAmount.uiAmount;
				console.log('%s: %i', token.pubkey.toBase58(), amount);
			});
		});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
