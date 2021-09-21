import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { deserializeUnchecked } from 'borsh';
import { Metadata, METADATA_SCHEMA } from './schema';
import { extendBorsh } from './borsh';

extendBorsh();

// use your wallet pubkey
const pubKey: PublicKey = new PublicKey("4DQpzL1SCiutXjhCzGDCwcgShYxFKVxw13RZSvWKBqaa");

const METADATA_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export type StringPublicKey = string;

// Returns SPL Token accounts associated with a wallet account.
// Metaplex NFTs are SPL Tokens, so we must request to fetch them first, and filter later.
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

function mapMintPubkeys(record: { account: { data: any; }; }) {
    return new PublicKey(record.account.data.parsed.info.mint);
}

function mapMetadataData(record: { account: { data: any; }; }): Buffer {
    console.log(record.account.data);
    return record.account.data as Buffer;
}

function filterMetadataAccounts(record: any): boolean {
    // filter out undefined
    return record;
}

/// attempt to deserialise data buffer using borsh
function deserialiseMetadata(buffer: Buffer): Metadata {
	const metadata = deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer) as Metadata;
    const METADATA_REPLACE = new RegExp('\u0000', 'g');

	metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
	metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
	metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
	return metadata;
};

/// return all accounts owned by the metadata program, with a given mint address.
export async function fetchMetadataAccountsFromMint(mintPubKey: PublicKey): Promise<any> {
	return connection
		.getParsedProgramAccounts(METADATA_ID, {
			filters: [
				{
					memcmp: {
						offset:
							1 + // key
							32, // update auth
						bytes: mintPubKey.toBase58()
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
    const metadata = await Promise.all(
        tokens
            .map(mapMintPubkeys)
            .map(fetchMetadataAccountsFromMint)
        ).then(result =>
            result
                .filter(filterMetadataAccounts)
                .map(mapMetadataData)
                .map(deserialiseMetadata)
            );

    console.log(metadata);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });