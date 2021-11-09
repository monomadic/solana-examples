import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	let { txId, mint, metadata, edition } = await metaplex.actions.mintNFT({
		connection,
		wallet: new metaplex.NodeWallet(keypair),
		uri: 'https://gist.githubusercontent.com/monomadic/5712efdf094aad247486cef9cb21a07d/raw/5847fedb80dd3de63933db02b6a325a8066357ec/metadata.json',
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
