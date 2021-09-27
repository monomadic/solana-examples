import web3 = require('@solana/web3.js');
import borsh = require('borsh');

import { createAirdroppedAccount } from '../shared/accounts';
import { programIds } from '../shared/common';
import { InitVaultArgs, VAULT_SCHEMA } from '../shared/schema/vault';

const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

function createVaultTransaction(
	fractionalMint: web3.PublicKey,
	redeemTreasury: web3.PublicKey,
	fractionalTreasury: web3.PublicKey,
	vault: web3.PublicKey,
	vaultAuthority: web3.PublicKey,
	pricingLookupAddress: web3.PublicKey
): web3.Transaction {
	const data = Buffer.from(
		borsh.serialize(VAULT_SCHEMA, new InitVaultArgs({ allowFurtherShareCreation: false }))
	);

	const tokenProgramId = new web3.PublicKey(programIds.token);
	const vaultProgramId = new web3.PublicKey(programIds.vault);
	const sysvarRentPubkey = new web3.PublicKey('SysvarRent111111111111111111111111111111111');

	const keys = [
		{ pubkey: fractionalMint, isSigner: false, isWritable: true },
		{ pubkey: redeemTreasury, isSigner: false, isWritable: true },
		{ pubkey: fractionalTreasury, isSigner: false, isWritable: true },
		{ pubkey: vault, isSigner: false, isWritable: true },
		{ pubkey: vaultAuthority, isSigner: false, isWritable: false },
		{ pubkey: pricingLookupAddress, isSigner: false, isWritable: false },
		{ pubkey: tokenProgramId, isSigner: false, isWritable: false },
		{ pubkey: sysvarRentPubkey, isSigner: false, isWritable: false },
	];

	return new web3.Transaction().add(
		new web3.TransactionInstruction({
			keys,
			programId: vaultProgramId,
			data,
		})
	);
}

async function createDerivedProgramAddress(
	prefix: string,
	programAddress: web3.PublicKey,
	address: web3.PublicKey
): Promise<web3.PublicKey> {
	return (
		await web3.PublicKey.findProgramAddress(
			[Buffer.from(prefix), programAddress.toBuffer(), address.toBuffer()],
			programAddress
		)
	)[0];
}

async function main() {
	const creatorKeypair: web3.Keypair = await createAirdroppedAccount();

	// vault must be a signer
	const vault = web3.Keypair.generate();
	console.log('Vault:', vault.publicKey.toBase58());

	// the derived program address for a vault authority
	// tokens released from vault are released to vault authority
	const vaultAuthority: web3.PublicKey = await createDerivedProgramAddress(
		'vault',
		new web3.PublicKey(programIds.vault),
		vault.publicKey
	);
	console.log('Vault Authority:', vaultAuthority.toBase58());

	const fractionalMint: web3.PublicKey = web3.Keypair.generate().publicKey;
	const redeemTreasury: web3.PublicKey = web3.Keypair.generate().publicKey;
	const fractionalTreasury: web3.PublicKey = web3.Keypair.generate().publicKey;
	const pricingLookupAddress: web3.PublicKey = web3.Keypair.generate().publicKey;

	const transaction: web3.Transaction = createVaultTransaction(
		fractionalMint,
		redeemTreasury,
		fractionalTreasury,
		vault.publicKey,
		vaultAuthority,
		pricingLookupAddress
	);

	// sign transaction, broadcast, and confirm
	const signature: string = await web3.sendAndConfirmTransaction(connection, transaction, [
		creatorKeypair,
	]);

	console.log('tx signature:', signature);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
