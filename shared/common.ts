import { PublicKey } from '@solana/web3.js';

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

export const findProgramAddress = async (seeds: (Buffer | Uint8Array)[], programId: PublicKey) => {
	const result = await PublicKey.findProgramAddress(seeds, programId);

	return [result[0].toBase58(), result[1]] as [string, number];
};
