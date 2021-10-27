import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

async function main() {
	const connection = new metaplex.Connection(config.cluster);
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	const account = await metaplex.Account.load(connection, keypair.publicKey);
	const metadata = await metaplex.programs.metadata.Metadata.load(connection, keypair.publicKey);

	console.log(keypair.publicKey);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
