import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';

import { programIds, StringPublicKey } from '../common';
import { ExternalPriceAccount, MAX_EXTERNAL_ACCOUNT_SIZE, updateExternalPriceAccount } from '../metaplex';
import { WRAPPED_SOL_MINT } from './common';

// This command creates the external pricing oracle
export async function createExternalPriceAccount(
	connection: Connection,
	payer: PublicKey
): Promise<{
	priceMint: StringPublicKey;
	externalPriceAccount: StringPublicKey;
	instructions: TransactionInstruction[];
	signers: Keypair[];
}> {
	const PROGRAM_IDS = programIds;

	const signers: Keypair[] = [];
	const instructions: TransactionInstruction[] = [];

	const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
		MAX_EXTERNAL_ACCOUNT_SIZE
	);

	const externalPriceAccount = Keypair.generate();
	const key = externalPriceAccount.publicKey.toBase58();

	const epaStruct = new ExternalPriceAccount({
		pricePerShare: new BN(0),
		priceMint: WRAPPED_SOL_MINT.toBase58(),
		allowedToCombine: true,
	});

	const uninitializedEPA = SystemProgram.createAccount({
		fromPubkey: payer,
		newAccountPubkey: externalPriceAccount.publicKey,
		lamports: epaRentExempt,
		space: MAX_EXTERNAL_ACCOUNT_SIZE,
		programId: new PublicKey(PROGRAM_IDS.vault),
	});
	instructions.push(uninitializedEPA);
	signers.push(externalPriceAccount);

	await updateExternalPriceAccount(key, epaStruct, instructions);

	return {
		externalPriceAccount: key,
		priceMint: WRAPPED_SOL_MINT.toBase58(),
		instructions,
		signers,
	};
}
