import splToken = require('@solana/spl-token');
import { AccountMeta, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { deserializeUnchecked, serialize } from 'borsh';

import { findProgramAddress, programIds, StringPublicKey } from '../common';

export const VAULT_PREFIX = 'vault';
export enum VaultKey {
	Uninitialized = 0,
	VaultV1 = 3,
	SafetyDepositBoxV1 = 1,
	ExternalPriceAccountV1 = 2,
}

export enum VaultState {
	Inactive = 0,
	Active = 1,
	Combined = 2,
	Deactivated = 3,
}

export const MAX_VAULT_SIZE = 1 + 32 + 32 + 32 + 32 + 1 + 32 + 1 + 32 + 1 + 1 + 8;

export const MAX_EXTERNAL_ACCOUNT_SIZE = 1 + 8 + 32 + 1;
export class Vault {
	key: VaultKey;
	/// Store token program used
	tokenProgram: StringPublicKey;
	/// Mint that produces the fractional shares
	fractionMint: StringPublicKey;
	/// Authority who can make changes to the vault
	authority: StringPublicKey;
	/// treasury where fractional shares are held for redemption by authority
	fractionTreasury: StringPublicKey;
	/// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
	redeemTreasury: StringPublicKey;
	/// Can authority mint more shares from fraction_mint after activation
	allowFurtherShareCreation: boolean;

	/// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
	pricingLookupAddress: StringPublicKey;
	/// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
	/// then we increment it and save so the next safety deposit box gets the next number.
	/// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
	/// The authority of the vault withdrawals a Safety Deposit contents to count down how many
	/// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
	/// then we can deactivate the vault.
	tokenTypeCount: number;
	state: VaultState;

	/// Once combination happens, we copy price per share to vault so that if something nefarious happens
	/// to external price account, like price change, we still have the math 'saved' for use in our calcs
	lockedPricePerShare: BN;

	constructor(args: {
		tokenProgram: StringPublicKey;
		fractionMint: StringPublicKey;
		authority: StringPublicKey;
		fractionTreasury: StringPublicKey;
		redeemTreasury: StringPublicKey;
		allowFurtherShareCreation: boolean;
		pricingLookupAddress: StringPublicKey;
		tokenTypeCount: number;
		state: VaultState;
		lockedPricePerShare: BN;
	}) {
		this.key = VaultKey.VaultV1;
		this.tokenProgram = args.tokenProgram;
		this.fractionMint = args.fractionMint;
		this.authority = args.authority;
		this.fractionTreasury = args.fractionTreasury;
		this.redeemTreasury = args.redeemTreasury;
		this.allowFurtherShareCreation = args.allowFurtherShareCreation;
		this.pricingLookupAddress = args.pricingLookupAddress;
		this.tokenTypeCount = args.tokenTypeCount;
		this.state = args.state;
		this.lockedPricePerShare = args.lockedPricePerShare;
	}
}

/**
 * Stores the token account containing the tokens, its vault, and order.
 * https://docs.metaplex.com/#safety-deposit-box
 * */
export class SafetyDepositBox {
	/// Type of vault
	key: VaultKey;
	/// VaultKey pointing to the parent vault
	vault: StringPublicKey;
	/// This particular token's mint
	tokenMint: StringPublicKey;
	/// Account that stores the tokens under management
	store: StringPublicKey;
	/// the order in the array of registries
	order: number;

	constructor(args: {
		vault: StringPublicKey;
		tokenMint: StringPublicKey;
		store: StringPublicKey;
		order: number;
	}) {
		this.key = VaultKey.SafetyDepositBoxV1;
		this.vault = args.vault;
		this.tokenMint = args.tokenMint;
		this.store = args.store;
		this.order = args.order;
	}
}

export class ExternalPriceAccount {
	key: VaultKey;
	pricePerShare: BN;
	/// Mint of the currency we are pricing the shares against, should be same as redeem_treasury.
	/// Most likely will be USDC mint most of the time.
	priceMint: StringPublicKey;
	/// Whether or not combination has been allowed for this vault.
	allowedToCombine: boolean;

	constructor(args: {
		pricePerShare: BN;
		priceMint: StringPublicKey;
		allowedToCombine: boolean;
	}) {
		this.key = VaultKey.ExternalPriceAccountV1;
		this.pricePerShare = args.pricePerShare;
		this.priceMint = args.priceMint;
		this.allowedToCombine = args.allowedToCombine;
	}
}

export class InitVaultArgs {
	instruction: number = 0;
	allowFurtherShareCreation: boolean = false;

	constructor(args: { allowFurtherShareCreation: boolean }) {
		this.allowFurtherShareCreation = args.allowFurtherShareCreation;
	}
}

class AmountArgs {
	instruction: number;
	amount: BN;

	constructor(args: { instruction: number; amount: BN }) {
		this.instruction = args.instruction;
		this.amount = args.amount;
	}
}

class NumberOfShareArgs {
	instruction: number;
	numberOfShares: BN;

	constructor(args: { instruction: number; numberOfShares: BN }) {
		this.instruction = args.instruction;
		this.numberOfShares = args.numberOfShares;
	}
}

class UpdateExternalPriceAccountArgs {
	instruction: number = 9;
	externalPriceAccount: ExternalPriceAccount;

	constructor(args: { externalPriceAccount: ExternalPriceAccount }) {
		this.externalPriceAccount = args.externalPriceAccount;
	}
}

export const VAULT_SCHEMA = new Map<any, any>([
	[
		InitVaultArgs,
		{
			kind: 'struct',
			fields: [
				['instruction', 'u8'],
				['allowFurtherShareCreation', 'u8'],
			],
		},
	],
	[
		AmountArgs,
		{
			kind: 'struct',
			fields: [
				['instruction', 'u8'],
				['amount', 'u64'],
			],
		},
	],
	[
		NumberOfShareArgs,
		{
			kind: 'struct',
			fields: [
				['instruction', 'u8'],
				['numberOfShares', 'u64'],
			],
		},
	],
	[
		UpdateExternalPriceAccountArgs,
		{
			kind: 'struct',
			fields: [
				['instruction', 'u8'],
				['externalPriceAccount', ExternalPriceAccount],
			],
		},
	],
	[
		Vault,
		{
			kind: 'struct',
			fields: [
				['key', 'u8'],
				['tokenProgram', 'pubkeyAsString'],
				['fractionMint', 'pubkeyAsString'],
				['authority', 'pubkeyAsString'],
				['fractionTreasury', 'pubkeyAsString'],
				['redeemTreasury', 'pubkeyAsString'],
				['allowFurtherShareCreation', 'u8'],
				['pricingLookupAddress', 'pubkeyAsString'],
				['tokenTypeCount', 'u8'],
				['state', 'u8'],
				['lockedPricePerShare', 'u64'],
			],
		},
	],
	[
		SafetyDepositBox,
		{
			kind: 'struct',
			fields: [
				['key', 'u8'],
				['vault', 'pubkeyAsString'],
				['tokenMint', 'pubkeyAsString'],
				['store', 'pubkeyAsString'],
				['order', 'u8'],
			],
		},
	],
	[
		ExternalPriceAccount,
		{
			kind: 'struct',
			fields: [
				['key', 'u8'],
				['pricePerShare', 'u64'],
				['priceMint', 'pubkeyAsString'],
				['allowedToCombine', 'u8'],
			],
		},
	],
]);

export const decodeVault = (buffer: Buffer) => {
	return deserializeUnchecked(VAULT_SCHEMA, Vault, buffer) as Vault;
};

export const decodeExternalPriceAccount = (buffer: Buffer) => {
	return deserializeUnchecked(VAULT_SCHEMA, ExternalPriceAccount, buffer) as ExternalPriceAccount;
};

export const decodeSafetyDeposit = (buffer: Buffer) => {
	return deserializeUnchecked(VAULT_SCHEMA, SafetyDepositBox, buffer) as SafetyDepositBox;
};

export async function setVaultAuthority(
	vault: StringPublicKey,
	currentAuthority: StringPublicKey,
	newAuthority: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const data = Buffer.from([10]);

	const keys = [
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(currentAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(newAuthority),
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data: data,
		})
	);
}

export async function initVault(
	allowFurtherShareCreation: boolean,
	fractionalMint: StringPublicKey,
	redeemTreasury: StringPublicKey,
	fractionalTreasury: StringPublicKey,
	vault: StringPublicKey,
	vaultAuthority: StringPublicKey,
	pricingLookupAddress: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const data = Buffer.from(
		serialize(VAULT_SCHEMA, new InitVaultArgs({ allowFurtherShareCreation }))
	);

	const keys: AccountMeta[] = [
		{
			pubkey: new PublicKey(fractionalMint),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(redeemTreasury),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionalTreasury),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vaultAuthority),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(pricingLookupAddress),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(splToken.TOKEN_PROGRAM_ID),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: SYSVAR_RENT_PUBKEY,
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data: data,
		})
	);
}

export async function getSafetyDepositBox(
	vault: StringPublicKey,
	tokenMint: StringPublicKey
): Promise<StringPublicKey> {
	const vaultProgramId = programIds.vault;

	return (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				new PublicKey(vault).toBuffer(),
				new PublicKey(tokenMint).toBuffer(),
			],
			new PublicKey(vaultProgramId)
		)
	)[0];
}

export async function addTokenToInactiveVault(
	amount: BN,
	tokenMint: StringPublicKey,
	tokenAccount: StringPublicKey,
	tokenStoreAccount: StringPublicKey,
	vault: StringPublicKey,
	vaultAuthority: StringPublicKey,
	payer: StringPublicKey,
	transferAuthority: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const safetyDepositBox = await getSafetyDepositBox(vault, tokenMint);

	const value = new AmountArgs({
		instruction: 1,
		amount,
	});

	const data = Buffer.from(serialize(VAULT_SCHEMA, value));
	const keys = [
		{
			pubkey: new PublicKey(safetyDepositBox),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(tokenAccount),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(tokenStoreAccount),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vaultAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(payer),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(transferAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(programIds.token),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: SYSVAR_RENT_PUBKEY,
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: SystemProgram.programId,
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data,
		})
	);
}

export async function activateVault(
	numberOfShares: BN,
	vault: StringPublicKey,
	fractionMint: StringPublicKey,
	fractionTreasury: StringPublicKey,
	vaultAuthority: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const fractionMintAuthority = (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				new PublicKey(vaultProgramId).toBuffer(),
				new PublicKey(vault).toBuffer(),
			],
			new PublicKey(vaultProgramId)
		)
	)[0];

	const value = new NumberOfShareArgs({ instruction: 2, numberOfShares });
	const data = Buffer.from(serialize(VAULT_SCHEMA, value));

	const keys = [
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionMint),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionTreasury),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionMintAuthority),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(vaultAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(programIds.token),
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data,
		})
	);
}

export async function combineVault(
	vault: StringPublicKey,
	outstandingShareTokenAccount: StringPublicKey,
	payingTokenAccount: StringPublicKey,
	fractionMint: StringPublicKey,
	fractionTreasury: StringPublicKey,
	redeemTreasury: StringPublicKey,
	newVaultAuthority: StringPublicKey | undefined,
	vaultAuthority: StringPublicKey,
	transferAuthority: StringPublicKey,
	externalPriceAccount: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const burnAuthority = (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				new PublicKey(vaultProgramId).toBuffer(),
				new PublicKey(vault).toBuffer(),
			],
			new PublicKey(vaultProgramId)
		)
	)[0];

	const data = Buffer.from([3]);

	const keys = [
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(outstandingShareTokenAccount),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(payingTokenAccount),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionMint),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionTreasury),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(redeemTreasury),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(newVaultAuthority || vaultAuthority),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(vaultAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(transferAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(burnAuthority),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(externalPriceAccount),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(programIds.token),
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data,
		})
	);
}

export async function withdrawTokenFromSafetyDepositBox(
	amount: BN,
	destination: StringPublicKey,
	safetyDepositBox: StringPublicKey,
	storeKey: StringPublicKey,
	vault: StringPublicKey,
	fractionMint: StringPublicKey,
	vaultAuthority: StringPublicKey,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const transferAuthority = (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				new PublicKey(vaultProgramId).toBuffer(),
				new PublicKey(vault).toBuffer(),
			],
			new PublicKey(vaultProgramId)
		)
	)[0];

	const value = new AmountArgs({ instruction: 5, amount });
	const data = Buffer.from(serialize(VAULT_SCHEMA, value));

	const keys = [
		{
			pubkey: new PublicKey(destination),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(safetyDepositBox),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(storeKey),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vault),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(fractionMint),
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: new PublicKey(vaultAuthority),
			isSigner: true,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(transferAuthority),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: new PublicKey(programIds.token),
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: SYSVAR_RENT_PUBKEY,
			isSigner: false,
			isWritable: false,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data,
		})
	);
}

export async function updateExternalPriceAccount(
	externalPriceAccountKey: StringPublicKey,
	externalPriceAccount: ExternalPriceAccount,
	instructions: TransactionInstruction[]
) {
	const vaultProgramId = programIds.vault;

	const value = new UpdateExternalPriceAccountArgs({ externalPriceAccount });
	const data = Buffer.from(serialize(VAULT_SCHEMA, value));
	console.log('Data', data);

	const keys = [
		{
			pubkey: new PublicKey(externalPriceAccountKey),
			isSigner: false,
			isWritable: true,
		},
	];
	instructions.push(
		new TransactionInstruction({
			keys,
			programId: new PublicKey(vaultProgramId),
			data,
		})
	);
}

export async function getSafetyDepositBoxAddress(
	vault: StringPublicKey,
	tokenMint: StringPublicKey
): Promise<StringPublicKey> {
	const PROGRAM_IDS = programIds;
	return (
		await findProgramAddress(
			[
				Buffer.from(VAULT_PREFIX),
				new PublicKey(vault).toBuffer(),
				new PublicKey(tokenMint).toBuffer(),
			],
			new PublicKey(PROGRAM_IDS.vault)
		)
	)[0];
}
