import splToken = require('@solana/spl-token');
import web3 = require('@solana/web3.js');
import borsh = require('borsh');

import { createAirdroppedAccount } from '../shared/accounts';
import { programIds } from '../shared/common';
import { InitVaultArgs, VAULT_SCHEMA } from '../shared/schema/vault';

const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
const tokenProgramId = new web3.PublicKey(programIds.token);
const vaultProgramId = new web3.PublicKey(programIds.vault);

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

async function createMint(
	signer: web3.Signer,
	payer: web3.PublicKey,
	vaultAuthority: web3.PublicKey,
	freezeAuthority: web3.PublicKey | null
): Promise<web3.Keypair> {
	const account: web3.Keypair = web3.Keypair.generate();
	let transaction: web3.Transaction = new web3.Transaction();

	// const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
	// 	splToken.MintLayout.span
	// );
	const mintRentExempt = 10;

	transaction.add(
		web3.SystemProgram.createAccount({
			fromPubkey: payer,
			newAccountPubkey: account.publicKey,
			lamports: mintRentExempt, // lamports to transfer to new account
			space: splToken.MintLayout.span,
			programId: splToken.TOKEN_PROGRAM_ID,
		})
	);

	// transaction.add(
	// 	splToken.Token.createInitMintInstruction(
	// 		splToken.TOKEN_PROGRAM_ID,
	// 		account.publicKey, // mint
	// 		0, // decimals
	// 		vaultAuthority, // owner
	// 		freezeAuthority
	// 	)
	// );

	console.log('Creating mint...');

	await web3.sendAndConfirmTransaction(connection, transaction, [signer])
		.catch(err => console.log(err))
		.then(() => {
			console.log('Mint:', account.publicKey.toBase58());
		});

	return account;
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
	let signers: web3.Signer[] = [creatorKeypair];

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

	// let fractionalMint: web3.Keypair = await createMint(
	// 	creatorKeypair,
	// 	creatorKeypair.publicKey,
	// 	vaultAuthority,
	// 	null
	// );

	const fractionalMint: splToken.Token = await splToken.Token.createMint(
		connection,
		creatorKeypair, // payer
		creatorKeypair.publicKey, // mintAuthority
		null, // freezeAuthority
		0, // decimals
		splToken.TOKEN_PROGRAM_ID // the program to call when minting new tokens
	);
	// await fractionalMint.setAuthority(fractionalMint.publicKey, null, 'MintTokens', creatorKeypair.publicKey, []);
	signers.push(fractionalMint.payer);
	await fractionalMint.getOrCreateAssociatedAccountInfo(creatorKeypair.publicKey);
	console.log('Fractional Mint:', fractionalMint.publicKey.toBase58());

	const redeemTreasury: web3.PublicKey = web3.Keypair.generate().publicKey;


	

	const fractionalTreasury: web3.PublicKey = web3.Keypair.generate().publicKey;
	const pricingLookupAddress: web3.PublicKey = web3.Keypair.generate().publicKey;

	const transaction: web3.Transaction = createVaultTransaction(
		fractionalMint.publicKey,
		redeemTreasury,
		fractionalTreasury,
		vault.publicKey,
		vaultAuthority,
		pricingLookupAddress
	);

	// sign transaction, broadcast, and confirm
	const signature: string = await web3.sendAndConfirmTransaction(
		connection,
		transaction,
		signers
	);

	console.log('tx signature:', signature);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
