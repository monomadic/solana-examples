import { Connection, PublicKey, clusterApiUrl, ParsedAccountData } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// use your wallet pubkey
const pubKey: PublicKey = new PublicKey("4DQpzL1SCiutXjhCzGDCwcgShYxFKVxw13RZSvWKBqaa");

const METADATA_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

/**
 * Returns SPL Token accounts associated with a wallet account.
 * Metaplex NFTs are SPL Tokens, so we must request to fetch them first, and filter later. */
async function fetchSPLTokens(connection: Connection, pubKey: PublicKey) {
    return connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
        commitment: connection.commitment,
        filters: [
            { dataSize: 165 }, // compares the program account data length with the provided data size
            {
                memcmp: { // filter memory comparison
                    offset: 32, // owner metadata is 32 bytes offset
                    bytes: pubKey.toBase58(),
                }
            },
        ]
    });
}

/** Map only mint pubkey field (used to find associated metadata accounts) */
function mapMintAddress(record: { account: { data: any; }; }): PublicKey {
    return new PublicKey(record.account.data.parsed.info.mint);
}

async function fetchAccountData(mintAddress: PublicKey): Promise<{mint: PublicKey, decimals: number, supply: number}> {
    return connection.getParsedAccountInfo(mintAddress).then(account => {
        const data = account.value?.data as ParsedAccountData;
        return {
            mint: mintAddress,
            decimals: data.parsed.info.decimals,
            supply: data.parsed.info.supply,
        }
    });
}

/** Filter only NFT Token accounts */
function filterOnlyNFTs(account: {decimals: number, supply: number}): boolean {
    // should have a mint with a supply of 1, decimals 0.
    return (account.decimals == 0 && account.supply == 1);
}

/** Return all accounts owned by the metadata program, with a given mint address. */
export async function fetchMetadataAccounts(account: { mint: PublicKey }): Promise<any> {
	return connection
		.getParsedProgramAccounts(METADATA_ID, {
			filters: [
				{
					memcmp: {
						offset:
							1 + // key
							32, // update auth
						bytes: account.mint.toBase58()
					}
				}
			]
		})
		.then((accounts) => {
            return accounts[0];
		});
}

async function main() {
    const tokens = await fetchSPLTokens(connection, pubKey);
    // console.log(tokens[0].account.data);

    const metadata = await Promise.all(
        tokens
            .map(mapMintAddress)
            .map(fetchAccountData)
        ).then(mints => Promise.all(mints
            .filter(filterOnlyNFTs)
            .map(fetchMetadataAccounts)
        ));

    console.log(metadata);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });