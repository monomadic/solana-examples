import { AccountInfo as TokenAccountInfo, AccountLayout, MintLayout, Token, u64 } from '@solana/spl-token';
import { AccountInfo, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';

import { StringPublicKey } from '../common';
import { SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from '../metaplex';
import { chunks } from './utils';

// import { cache } from '../contexts/accounts';
export interface TokenAccount {
	pubkey: string;
	account: AccountInfo<Buffer>;
	info: TokenAccountInfo;
}

export interface ParsedAccountBase {
	pubkey: StringPublicKey;
	account: AccountInfo<Buffer>;
	info: any; // TODO: change to unknown
}

export type AccountParser = (
	pubkey: StringPublicKey,
	data: AccountInfo<Buffer>
) => ParsedAccountBase | undefined;

export interface ParsedAccount<T> extends ParsedAccountBase {
	info: T;
}

export const getMultipleAccounts = async (connection: any, keys: string[], commitment: string) => {
	const result = await Promise.all(
		chunks(keys, 99).map((chunk) => getMultipleAccountsCore(connection, chunk, commitment))
	);

	const array = result
		.map(
			(a) =>
				a.array.map((acc) => {
					if (!acc) {
						return undefined;
					}

					const { data, ...rest } = acc;
					const obj = {
						...rest,
						data: Buffer.from(data[0], 'base64'),
					} as AccountInfo<Buffer>;
					return obj;
				}) as AccountInfo<Buffer>[]
		)
		.flat();
	return { keys, array };
};

const getMultipleAccountsCore = async (connection: any, keys: string[], commitment: string) => {
	const args = connection._buildArgs([keys], commitment, 'base64');

	const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
	if (unsafeRes.error) {
		throw new Error('failed to get info about account ' + unsafeRes.error.message);
	}

	if (unsafeRes.result.value) {
		const array = unsafeRes.result.value as AccountInfo<string[]>[];
		return { keys, array };
	}

	// TODO: fix
	throw new Error();
};

export const deserializeAccount = (data: Buffer) => {
	const accountInfo = AccountLayout.decode(data);
	accountInfo.mint = new PublicKey(accountInfo.mint);
	accountInfo.owner = new PublicKey(accountInfo.owner);
	accountInfo.amount = u64.fromBuffer(accountInfo.amount);

	if (accountInfo.delegateOption === 0) {
		accountInfo.delegate = null;
		accountInfo.delegatedAmount = new u64(0);
	} else {
		accountInfo.delegate = new PublicKey(accountInfo.delegate);
		accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
	}

	accountInfo.isInitialized = accountInfo.state !== 0;
	accountInfo.isFrozen = accountInfo.state === 2;

	if (accountInfo.isNativeOption === 1) {
		accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
		accountInfo.isNative = true;
	} else {
		accountInfo.rentExemptReserve = null;
		accountInfo.isNative = false;
	}

	if (accountInfo.closeAuthorityOption === 0) {
		accountInfo.closeAuthority = null;
	} else {
		accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
	}

	return accountInfo;
};

export const TokenAccountParser = (pubKey: string, info: AccountInfo<Buffer>) => {
	// Sometimes a wrapped sol account gets closed, goes to 0 length,
	// triggers an update over wss which triggers this guy to get called
	// since your UI already logged that pubkey as a token account. Check for length.
	if (info.data.length > 0) {
		const buffer = Buffer.from(info.data);
		const data = deserializeAccount(buffer);

		const details = {
			pubkey: pubKey,
			account: {
				...info,
			},
			info: data,
		} as TokenAccount;

		return details;
	}
};

export function ensureSplAccount(
	instructions: TransactionInstruction[],
	cleanupInstructions: TransactionInstruction[],
	toCheck: TokenAccount,
	payer: PublicKey,
	amount: number,
	signers: Keypair[]
) {
	if (!toCheck.info.isNative) {
		return toCheck.pubkey;
	}

	const account = createUninitializedAccount(instructions, payer, amount, signers);

	instructions.push(
		Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT, account, payer)
	);

	cleanupInstructions.push(
		Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, account, payer, payer, [])
	);

	return account;
}

export const DEFAULT_TEMP_MEM_SPACE = 65548;

export function createTempMemoryAccount(
	instructions: TransactionInstruction[],
	payer: PublicKey,
	signers: Keypair[],
	owner: PublicKey,
	space = DEFAULT_TEMP_MEM_SPACE
) {
	const account = Keypair.generate();
	instructions.push(
		SystemProgram.createAccount({
			fromPubkey: payer,
			newAccountPubkey: account.publicKey,
			// 0 will evict/close account since it cannot pay rent
			lamports: 0,
			space: space,
			programId: owner,
		})
	);

	signers.push(account);

	return account.publicKey;
}

export function createUninitializedMint(
	instructions: TransactionInstruction[],
	payer: PublicKey,
	amount: number,
	signers: Keypair[]
) {
	const account = Keypair.generate();
	instructions.push(
		SystemProgram.createAccount({
			fromPubkey: payer,
			newAccountPubkey: account.publicKey,
			lamports: amount,
			space: MintLayout.span,
			programId: TOKEN_PROGRAM_ID,
		})
	);

	signers.push(account);

	return account.publicKey;
}

export function createUninitializedAccount(
	instructions: TransactionInstruction[],
	payer: PublicKey,
	amount: number,
	signers: Keypair[]
) {
	const account = Keypair.generate();
	instructions.push(
		SystemProgram.createAccount({
			fromPubkey: payer,
			newAccountPubkey: account.publicKey,
			lamports: amount,
			space: AccountLayout.span,
			programId: TOKEN_PROGRAM_ID,
		})
	);

	signers.push(account);

	return account.publicKey;
}

export function createAssociatedTokenAccountInstruction(
	instructions: TransactionInstruction[],
	associatedTokenAddress: PublicKey,
	payer: PublicKey,
	walletAddress: PublicKey,
	splTokenMintAddress: PublicKey
) {
	const keys = [
		{
			pubkey: payer,
			isSigner: true,
			isWritable: true,
		},
		{
			pubkey: associatedTokenAddress,
			isSigner: false,
			isWritable: true,
		},
		{
			pubkey: walletAddress,
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: splTokenMintAddress,
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: SystemProgram.programId,
			isSigner: false,
			isWritable: false,
		},
		{
			pubkey: TOKEN_PROGRAM_ID,
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
			programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
			data: Buffer.from([]),
		})
	);
}

export function createMint(
	instructions: TransactionInstruction[],
	payer: PublicKey,
	mintRentExempt: number,
	decimals: number,
	owner: PublicKey,
	freezeAuthority: PublicKey,
	signers: Keypair[]
) {
	const account = createUninitializedMint(instructions, payer, mintRentExempt, signers);

	instructions.push(
		Token.createInitMintInstruction(TOKEN_PROGRAM_ID, account, decimals, owner, freezeAuthority)
	);

	return account;
}

export function createTokenAccount(
	instructions: TransactionInstruction[],
	payer: PublicKey,
	accountRentExempt: number,
	mint: PublicKey,
	owner: PublicKey,
	signers: Keypair[]
) {
	const account = createUninitializedAccount(instructions, payer, accountRentExempt, signers);

	instructions.push(Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, mint, account, owner));

	return account;
}

export function ensureWrappedAccount(
	instructions: TransactionInstruction[],
	cleanupInstructions: TransactionInstruction[],
	toCheck: TokenAccount | undefined,
	payer: PublicKey,
	amount: number,
	signers: Keypair[]
) {
	if (toCheck && !toCheck.info.isNative) {
		return toCheck.pubkey;
	}

	const account = Keypair.generate();
	instructions.push(
		SystemProgram.createAccount({
			fromPubkey: payer,
			newAccountPubkey: account.publicKey,
			lamports: amount,
			space: AccountLayout.span,
			programId: TOKEN_PROGRAM_ID,
		})
	);

	instructions.push(
		Token.createInitAccountInstruction(
			TOKEN_PROGRAM_ID,
			WRAPPED_SOL_MINT,
			account.publicKey,
			payer
		)
	);

	cleanupInstructions.push(
		Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, account.publicKey, payer, payer, [])
	);

	signers.push(account);

	return account.publicKey.toBase58();
}

// TODO: check if one of to accounts needs to be native sol ... if yes unwrap it ...
export function findOrCreateAccountByMint(
	payer: PublicKey,
	owner: PublicKey,
	instructions: TransactionInstruction[],
	cleanupInstructions: TransactionInstruction[],
	accountRentExempt: number,
	mint: PublicKey, // use to identify same type
	signers: Keypair[],
	excluded?: Set<string>
): PublicKey {
	const accountToFind = mint.toBase58();
	const ownerKey = owner.toBase58();
	const account = owner.toBase58(); // fix this
	// const account = cache
	// 	.byParser(TokenAccountParser)
	// 	.map((id) => cache.get(id))
	// 	.find(
	// 		(acc) =>
	// 			acc !== undefined &&
	// 			acc.info.mint.toBase58() === accountToFind &&
	// 			acc.info.owner.toBase58() === ownerKey &&
	// 			(excluded === undefined || !excluded.has(acc.pubkey))
	// 	);
	const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

	let toAccount: PublicKey;
	if (account && !isWrappedSol) {
		toAccount = new PublicKey(account);
	} else {
		// creating depositor pool account
		toAccount = createTokenAccount(
			instructions,
			payer,
			accountRentExempt,
			mint,
			owner,
			signers
		);

		if (isWrappedSol) {
			cleanupInstructions.push(
				Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, toAccount, payer, payer, [])
			);
		}
	}

	return toAccount;
}