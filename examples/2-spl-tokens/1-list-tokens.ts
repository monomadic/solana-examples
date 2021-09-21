import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';

// wallet pk
const pubKey = new PublicKey("4DQpzL1SCiutXjhCzGDCwcgShYxFKVxw13RZSvWKBqaa");

// the Token program's Program Derived Address
// const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

(async () => {
    // Connect to devnet cluster
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // https://docs.solana.com/developing/clients/jsonrpc-api#getprogramaccounts
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
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

    console.log('Found %d spl-tokens.', accounts.length);

    accounts.map((_account, _index) => {
        const accountInfo = AccountLayout.decode(_account.account.data);
        accountInfo.mint = new PublicKey(accountInfo.mint);
        accountInfo.owner = new PublicKey(accountInfo.owner);
        accountInfo.amount = u64.fromBuffer(accountInfo.amount);

        console.log(accountInfo);
    });

  })();