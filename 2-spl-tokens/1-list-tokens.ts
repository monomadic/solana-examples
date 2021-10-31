import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));
	const tokens = await connection.getTokenAccountsByOwner(keypair.publicKey, {
		programId: splToken.TOKEN_PROGRAM_ID,
	});

	tokens.value.forEach((token) => {
		console.log(token);
	});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
