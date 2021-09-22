import { clusterApiUrl, Connection, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { createAirdroppedAccount } from '../shared/accounts';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function main() {
  const creatorKeypair: Keypair = await createAirdroppedAccount();

  // create the transaction (instruction array)
  const transaction: Transaction = new Transaction().add(
    // SystemProgram.transfer({
    //   fromPubkey: senderKeypair.publicKey,
    //   toPubkey: receiverPubKey,
    //   lamports: (LAMPORTS_PER_SOL / 100) * amount,
    // }),
  );

  // sign transaction, broadcast, and confirm
  const signature: string = await sendAndConfirmTransaction(
    connection,
    transaction,
    [creatorKeypair],
  );

  console.log('tx signature:', signature);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
