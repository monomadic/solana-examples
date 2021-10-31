// import * as splToken from '@solana/spl-token';
import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import { fetchSPLTokens } from '../2-spl-tokens/1-list-tokens';
import config from '../shared/config';

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	// const metadataProgramId: string = metaplex.programs.metadata.MetadataProgram.PUBKEY;

	const account: metaplex.Account<any> = await metaplex.Account.load(
		connection,
		keypair.publicKey
	);

	// Metaplex NFTs are SPL Tokens, so we must request to fetch them first, and filter later.
	const tokens = await fetchSPLTokens(connection, keypair.publicKey);

	const metadata = await Promise.all(tokens.map(mapMintAddress).map(fetchAccountData)).then(
		(mints) => Promise.all(mints.filter(filterOnlyNFTs).map(fetchMetadataAccounts))
	);

	console.log(metadata);
}

/** Map only mint pubkey field (used to find associated metadata accounts) */
function mapMintAddress(record: { account: { data: any } }): web3.PublicKey {
	return new web3.PublicKey(record.account.data.parsed.info.mint);
}

async function fetchAccountData(
	mintAddress: web3.PublicKey
): Promise<{ mint: web3.PublicKey; decimals: number; supply: number }> {
	return connection.getParsedAccountInfo(mintAddress).then((account) => {
		const data = account.value?.data as web3.ParsedAccountData;
		return {
			mint: mintAddress,
			decimals: data.parsed.info.decimals,
			supply: data.parsed.info.supply,
		};
	});
}

/** Filter only NFT Token accounts */
function filterOnlyNFTs(account: { decimals: number; supply: number }): boolean {
	// should have a mint with a supply of 1, decimals 0.
	return account.decimals == 0 && account.supply == 1;
}

/** Return all accounts owned by the metadata program, with a given mint address. */
export async function fetchMetadataAccounts(account: { mint: web3.PublicKey }): Promise<any> {
	return connection
		.getParsedProgramAccounts(metaplex.programs.metadata.Metadata, {
			filters: [
				{
					memcmp: {
						offset:
							1 + // key
							32, // update auth
						bytes: account.mint.toBase58(),
					},
				},
			],
		})
		.then((accounts) => {
			return accounts[0];
		});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
