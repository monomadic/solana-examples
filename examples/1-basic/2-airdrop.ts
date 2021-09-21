import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";

const receiverPubKey: PublicKey = Keypair.generate().publicKey;

function printLamports(lamports: number): string {
  return (lamports / 1e9).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

(async () => {
  // Connect to devnet cluster
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // request airdrop, sign with signers PK
  console.log("requesting airdrop...");
  let signature = await connection.requestAirdrop(
    receiverPubKey,
    LAMPORTS_PER_SOL, // 10000000 Lamports in 1 SOL
  );

  await connection.confirmTransaction(signature).then(async () => {
    console.log("SOL balance: ", printLamports(await connection.getBalance(receiverPubKey)));
  });
})();
