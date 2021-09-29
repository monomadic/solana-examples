// import splToken = require('@solana/spl-token');
// import borsh = require('borsh');
import web3 = require('@solana/web3.js');

const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

type VaultBuilder = {
	signer: web3.Signer; // wallet with enough SOL
	fractions: number; // amount of fractions to distribute
	vaultAuthority: web3.PublicKey;
	freezeAuthority?: web3.PublicKey;
};

async function main() {}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
