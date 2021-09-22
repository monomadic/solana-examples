import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export async function createAirdroppedAccount(): Promise<Keypair> {
  const receiverKeypair: Keypair = Keypair.generate();

  await connection.requestAirdrop(
    receiverKeypair.publicKey,
    LAMPORTS_PER_SOL, // 10000000 Lamports in 1 SOL
  );

  return receiverKeypair;
}
