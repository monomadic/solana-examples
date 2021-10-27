// import splToken = require('@solana/spl-token');
// import borsh = require('borsh');
import web3 = require('@solana/web3.js');

import metaplex = require('../shared/metaplex');

// const vault = new web3.PublicKey("67TfEsvLRSmMYmf14rEX1VLGKYG9uuzdSgtTmF6bz4ae");
const vault = new web3.PublicKey('6zTwh3MQK1h3mb2dM4deonby6kpE51yfrZKJa6gR8hGE');
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

async function fetchAccountData(address: web3.PublicKey): Promise<any> {
	return connection.getParsedAccountInfo(address).then((account) => {
		console.log(account);
		const data = account.value?.data as Buffer;
		let key = data.slice(0, 1);
		console.log(key);
		return data;
	});
}

async function main() {
	let accounts = await metaplex.getMultipleAccounts(connection, [vault.toBase58()], 'confirmed');
	console.log(accounts);

	console.log(await fetchAccountData(vault));
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
