import { AccountLayout, MintLayout } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

import { createMint, createTokenAccount } from './account';
import { findProgramAddress, programIds, StringPublicKey, toPublicKey } from './common';
import { initVault, MAX_VAULT_SIZE, VAULT_PREFIX } from './vault';

// This command creates the external pricing oracle a vault
// This gets the vault ready for adding the tokens.
export async function createVault(
	connection: Connection,
	payer: PublicKey,
	priceMint: StringPublicKey,
	externalPriceAccount: StringPublicKey
): Promise<{
	vault: StringPublicKey;
	fractionalMint: StringPublicKey;
	redeemTreasury: StringPublicKey;
	fractionTreasury: StringPublicKey;
	instructions: TransactionInstruction[];
	signers: Keypair[];
}> {
	const PROGRAM_IDS = programIds;

	const signers: Keypair[] = [];
	const instructions: TransactionInstruction[] = [];

	const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
		AccountLayout.span
	);

	const mintRentExempt = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

	const vaultRentExempt = await connection.getMinimumBalanceForRentExemption(MAX_VAULT_SIZE);

	const vault = Keypair.generate();

	const vaultAuthority = (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				toPublicKey(PROGRAM_IDS.vault).toBuffer(),
				vault.publicKey.toBuffer(),
			],
			toPublicKey(PROGRAM_IDS.vault)
		)
	)[0];

	const fractionalMint = createMint(
		instructions,
		payer,
		mintRentExempt,
		0,
		toPublicKey(vaultAuthority),
		toPublicKey(vaultAuthority),
		signers
	).toBase58();

	const redeemTreasury = createTokenAccount(
		instructions,
		payer,
		accountRentExempt,
		toPublicKey(priceMint),
		toPublicKey(vaultAuthority),
		signers
	).toBase58();

	const fractionTreasury = createTokenAccount(
		instructions,
		payer,
		accountRentExempt,
		toPublicKey(fractionalMint),
		toPublicKey(vaultAuthority),
		signers
	).toBase58();

	const uninitializedVault = SystemProgram.createAccount({
		fromPubkey: payer,
		newAccountPubkey: vault.publicKey,
		lamports: vaultRentExempt,
		space: MAX_VAULT_SIZE,
		programId: toPublicKey(PROGRAM_IDS.vault),
	});
	instructions.push(uninitializedVault);
	signers.push(vault);

	await initVault(
		true,
		fractionalMint,
		redeemTreasury,
		fractionTreasury,
		vault.publicKey.toBase58(),
		payer.toBase58(),
		externalPriceAccount,
		instructions
	);

	return {
		vault: vault.publicKey.toBase58(),
		fractionalMint,
		redeemTreasury,
		fractionTreasury,
		signers,
		instructions,
	};
}
