import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

// import uploadMetadata from './0-arweave';

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	// let meta = new metaplex.programs.metadata.CreateMetadata({}, {
	// });

	// let metadata = { };

	// await uploadMetadata('').then((txid) => {
	// 	console.log('uploaded json metadata to: https://arweave.net/%s', txid);
	// });

	let { txId, mint, metadata, edition } = await metaplex.actions.mintNFT({
		connection,
		wallet: new metaplex.NodeWallet(keypair),
		uri: 'https://arweave.net/fzqHw6a8gi5tyR2LAS2DZ6Z55v9y6Nt3eBAlJNwFub0',
		maxSupply: 10,
	});

	console.log({ txId, mint, metadata, edition });
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
