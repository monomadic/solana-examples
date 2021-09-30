import { AccountInfo, PublicKey } from '@solana/web3.js';

export type StringPublicKey = string;

export const programIds = {
	token: 'So11111111111111111111111111111111111111112',
	associatedToken: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
	bpf_upgrade_loader: 'BPFLoaderUpgradeab1e11111111111111111111111',
	system: '11111111111111111111111111111111',
	metadata: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
	memo: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
	vault: 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
	auction: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
	metaplex: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
};

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
	'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);
export const BPF_UPGRADE_LOADER_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
export const MEMO_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as StringPublicKey;
export const VAULT_ID = 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn' as StringPublicKey;
export const AUCTION_ID = 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8' as StringPublicKey;
export const METAPLEX_ID = 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98' as StringPublicKey;
export const SYSTEM = new PublicKey('11111111111111111111111111111111');

export class LazyAccountInfoProxy<T> {
	executable: boolean = false;
	owner: StringPublicKey = '';
	lamports: number = 0;

	get data() {
		//
		return undefined as unknown as T;
	}
}

export interface LazyAccountInfo {
	executable: boolean;
	owner: StringPublicKey;
	lamports: number;
	data: [string, string];
}

const PubKeysInternedMap = new Map<string, PublicKey>();

export const toPublicKey = (key: string | PublicKey) => {
	if (typeof key !== 'string') {
		return key;
	}

	let result = PubKeysInternedMap.get(key);
	if (!result) {
		result = new PublicKey(key);
		PubKeysInternedMap.set(key, result);
	}

	return result;
};

export interface PublicKeyStringAndAccount<T> {
	pubkey: string;
	account: AccountInfo<T>;
}

export const findProgramAddress = async (seeds: (Buffer | Uint8Array)[], programId: PublicKey) => {
	const result = await PublicKey.findProgramAddress(seeds, programId);

	return [result[0].toBase58(), result[1]] as [string, number];
};
