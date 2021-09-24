import { AccountInfo, clusterApiUrl, Connection, ParsedAccountData, PublicKey } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';

import { Vault, VAULT_SCHEMA } from '../shared/schema/vault';
import { extendBorsh } from './borsh';

extendBorsh();

// use your wallet pubkey
const VAULT_ID = new PublicKey('vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn');
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Returns SPL Token accounts associated with a wallet account.
async function fetchAllVaults() {
	return connection.getParsedProgramAccounts(VAULT_ID, {
		commitment: connection.commitment,
	});
}

function printVaults(
	vaults: {
		pubkey: PublicKey;
		account: AccountInfo<Buffer | ParsedAccountData>;
	}[]
) {
	const buffer: Buffer = vaults[0].account.data as Buffer;
	console.log(vaults[0].pubkey.toBase58());
	const vault: Vault = deserializeUnchecked(VAULT_SCHEMA, Vault, buffer);
	console.log(vault);
}

async function main() {
	await fetchAllVaults().then(printVaults);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
