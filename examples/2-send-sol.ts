import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// use your wallet pubkey
const pk = new PublicKey("4DQpzL1SCiutXjhCzGDCwcgShYxFKVxw13RZSvWKBqaa");

function printLamports(lamports: number): string {
  return (lamports / 1e9).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

(async () => {
  // Connect to devnet cluster
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(pk);

  console.log("SOL Balance: ", printLamports(balance));
})();