import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

// Returns SPL Token accounts associated with a wallet account.
async function fetchSPLTokens(connection: web3.Connection, pubKey: web3.PublicKey) {
	return connection.getParsedProgramAccounts(splToken.TOKEN_PROGRAM_ID, {
		commitment: connection.commitment,
		filters: [
			{ dataSize: 165 }, // compares the program account data length with the provided data size
			{
				memcmp: {
					// filter memory comparison
					offset: 32, // owner metadata is 32 bytes offset
					bytes: pubKey.toBase58(),
				},
			},
		],
	});
}

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));
	const tokens = await fetchSPLTokens(connection, keypair.publicKey);

	tokens.forEach((token) => {
		console.log(token);
	});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
