import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import { fetchSPLTokens } from '../2-spl-tokens/1-list-tokens';
import config from '../shared/config';

async function main() {
	const connection = new metaplex.Connection(config.cluster);
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	const tokens = await fetchSPLTokens(connection, keypair.publicKey);

	tokens.forEach((token) => {
		console.log(token);
	});

	// const account = await metaplex.Account.load(connection, keypair.publicKey);

	// const metadata = await metaplex.programs.metadata.Metadata.load(connection, account.publicKey);

	// console.log(account.toJSON());
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
