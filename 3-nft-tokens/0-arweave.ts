import Arweave from 'arweave';

/*
	We first need to upload our JSON metadata to arweave. The 'creators' array
	in this metadata needs to contain our current address.
*/

export async function uploadMetadata(data: string): Promise<string> {
	const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
	await arweave.network.getInfo().then(console.log);

	const key = await arweave.wallets.generate();
	const address = await arweave.wallets.jwkToAddress(key);

	await arweave.wallets
		.getBalance(address)
		.then((balance) => console.log('address: %s\nbalance: %i', address, balance));

	// note: if a key is not provided when creating a connection,
	// arweave.js will check for an injected browser wallet.
	const transaction = await arweave.createTransaction({ data }, key);

	transaction.addTag('Content-Type', 'application/json');

	await arweave.transactions.sign(transaction, key);

	return await arweave.transactions.getUploader(transaction).then(async (uploader) => {
		while (!uploader.isComplete) {
			await uploader.uploadChunk();
			console.log(
				`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
			);
		}
		return transaction.id;
	});
}

async function main() {
	await uploadMetadata(`
	{
		"name": "Pico-8 Poom",
		"symbol": "",
		"description": "It's poom poom!",
		"seller_fee_basis_points": 500,
		"image": "https://www.arweave.net/43xtSbpMnBs9svYNT3gGajHD3NctDsTs_pRT9NQvHz4?ext=png",
		"attributes": [
			{
				"trait_type": "",
				"value": "fps"
			}
		],
		"external_url": "",
		"properties": {
			"files": [
				{
					"uri": "https://www.arweave.net/43xtSbpMnBs9svYNT3gGajHD3NctDsTs_pRT9NQvHz4?ext=png",
					"type": "image/png"
				}
			],
			"category": "image",
			"creators": [
				{
					"address": "Aokoq5QWYXUscom7mY2xbWRVbRQGWqECdsHdWQsUMJH8",
					"share": 100
				}
			]
		}
	}
	`).then(console.log);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
