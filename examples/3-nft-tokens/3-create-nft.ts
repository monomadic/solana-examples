// see also:
// - https://www.quicknode.com/guides/web3-sdks/how-to-mint-an-nft-on-solana
//
import splToken = require('@solana/spl-token');
import web3 = require('@solana/web3.js');

import { createAirdroppedAccount } from '../shared/accounts';

async function main() {
	// Connect to cluster
	const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

	// Creator account with SOL
	const creatorKeypair = await createAirdroppedAccount();
	console.log('Creator account created:', creatorKeypair.publicKey.toBase58());

	// Token mint account
	const mint = await splToken.Token.createMint(
		connection,
		creatorKeypair,
		creatorKeypair.publicKey,
		null,
		9,
		splToken.TOKEN_PROGRAM_ID
	);
	console.log('Mint account created:', mint.publicKey.toBase58());

	// Get the associated token account of the creator account, if it does not exist, create it
	// https://spl.solana.com/associated-token-account
	const creatorTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
		creatorKeypair.publicKey
	);

	// Mint 1 new token to the associated token account, the creator account is the
	// minting authority (creator).
	await mint.mintTo(
		creatorTokenAccount.address, //who it goes to
		creatorKeypair.publicKey, // minting authority
		[], // multisig
		web3.LAMPORTS_PER_SOL * 1 // how many
	);

	// Set the minting authority (creator) on the mint as well.
	await mint.setAuthority(mint.publicKey, null, 'MintTokens', creatorKeypair.publicKey, []);

	// Create a destination wallet so we have somewhere to send the NFT.
	const desinationPubkey = web3.Keypair.generate().publicKey;
	console.log('Creator account created:', creatorKeypair.publicKey.toBase58());

	// Needs to have an associated program account
	var destinationTokenAccount = await mint.getOrCreateAssociatedAccountInfo(desinationPubkey);

	// Create an instruction array to transfer tokens from the creator into the destination account.
	var transaction = new web3.Transaction().add(
		splToken.Token.createTransferInstruction(
			splToken.TOKEN_PROGRAM_ID, // program id
			creatorTokenAccount.address, // source token account
			destinationTokenAccount.address, // destination token account
			creatorKeypair.publicKey, // owner account pubkey
			[], // creators (for multisign)
			1 // amount
		)
	);

	// Sign transaction, broadcast, and confirm
	var signature = await web3.sendAndConfirmTransaction(
		connection,
		transaction,
		[creatorKeypair],
		{ commitment: 'confirmed' }
	);

	console.log('Success. Sig:', signature);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\nError:\n', error);
		process.exit(1);
	});
