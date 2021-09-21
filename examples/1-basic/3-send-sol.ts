import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";

const senderKeypair: Keypair = Keypair.generate();
const receiverPubKey: PublicKey = Keypair.generate().publicKey;
const amount: number = 0.1;

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
  let airdropSignature = await connection.requestAirdrop(
    senderKeypair.publicKey,
    LAMPORTS_PER_SOL, // 10000000 Lamports in 1 SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // create the transaction (instruction array)
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: receiverPubKey,
      lamports: (LAMPORTS_PER_SOL / 100) * amount,
    }),
  );

  // sign transaction, broadcast, and confirm
  const signature: string = await sendAndConfirmTransaction(
    connection,
    transaction,
    [senderKeypair],
  );

  console.log('tx signature:', signature);
})();
