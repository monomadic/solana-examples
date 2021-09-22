import { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { createAirdroppedAccount } from '../shared/accounts';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const VAULT_ID = new PublicKey('vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn');

async function createDerivedProgramAddress(prefix: string, programAddress: PublicKey, address: PublicKey): Promise<PublicKey> {
  return (await PublicKey.findProgramAddress(
    [Buffer.from(prefix), programAddress.toBuffer(), address.toBuffer()],
    programAddress))[0];
}

async function main() {
  const creatorKeypair: Keypair = await createAirdroppedAccount();

  // vault must be a signer
  const vault = Keypair.generate();

  // the derived program address for a vault authority
  // tokens released from vault are released to vault authority
  const vaultAuthority: PublicKey = await createDerivedProgramAddress("vault", VAULT_ID, vault.publicKey);

  console.log(vaultAuthority);

  // // create the transaction (instruction array)
  // const transaction: Transaction = new Transaction().add(
  //   // SystemProgram.transfer({
  //   //   fromPubkey: senderKeypair.publicKey,
  //   //   toPubkey: receiverPubKey,
  //   //   lamports: (LAMPORTS_PER_SOL / 100) * amount,
  //   // }),
  // );

  // // sign transaction, broadcast, and confirm
  // const signature: string = await sendAndConfirmTransaction(
  //   connection,
  //   transaction,
  //   [creatorKeypair],
  // );

  // console.log('tx signature:', signature);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
