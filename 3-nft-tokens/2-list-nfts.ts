import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

const { Metadata } = metaplex.programs.metadata;

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));
	const metadatas = await Metadata.findByOwnerV2(connection, keypair.publicKey);

	await Promise.all(
		metadatas.map(async (metadata) => {
			const data = await Metadata.load(connection, metadata.pubkey);
			console.log(data.data);
		})
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
