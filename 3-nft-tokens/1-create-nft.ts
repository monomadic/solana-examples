import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import base58 from 'bs58';

import config from '../shared/config';

async function createNFTMint(
	connection,
	payer,
	mintAuthority,
	freezeAuthority,
	decimals,
	programId
) {
	const mintAccount = web3.Keypair.generate();
	const token = new splToken.Token(connection, mintAccount.publicKey, programId, payer); // Allocate memory for the account

	const balanceNeeded = await splToken.Token.getMinBalanceRentForExemptMint(connection);
	const transaction = new web3.Transaction();
	transaction.add(
		web3.SystemProgram.createAccount({
			fromPubkey: payer.publicKey,
			newAccountPubkey: mintAccount.publicKey,
			lamports: balanceNeeded,
			space: splToken.MintLayout.span,
			programId,
		})
	);
	transaction.add(
		splToken.Token.createInitMintInstruction(
			programId,
			mintAccount.publicKey,
			decimals,
			mintAuthority,
			freezeAuthority
		)
	); // Send the two instructions

	await web3.sendAndConfirmTransaction(connection, transaction, [payer, mintAccount], {
		skipPreflight: false,
	});

	return token;
}

async function main() {
	const connection = new web3.Connection(config.cluster, 'processed');
	const keypair = web3.Keypair.fromSecretKey(base58.decode(config.keypair));

	// First we create a mint account on your wallet.
	const mint = await splToken.Token.createMint(
		connection,
		keypair,
		keypair.publicKey, // mint authority
		null, // freeze
		0, // decimals
		splToken.TOKEN_PROGRAM_ID // program id
	);

	console.log('Mint account created:', mint.publicKey.toBase58());

	// Get the associated token account of the creator account, if it does not exist, create it
	// https://spl.solana.com/associated-token-account
	const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(keypair.publicKey);

	// Mint 1 new token to the associated token account, the creator account is the
	// minting authority (creator).
	await mint
		.mintTo(
			tokenAccount.address, // destination
			keypair.publicKey, // minting authority
			[], // multisig
			1 // how many
		)
		.then(() => console.log('minted to %s', tokenAccount.address));

	// release minting authority
	await mint.setAuthority(mint.publicKey, null, 'MintTokens', keypair.publicKey, []);

	// Create an instruction array to transfer tokens from the creator into the destination account.
	var transaction = new web3.Transaction().add(
		splToken.Token.createTransferInstruction(
			splToken.TOKEN_PROGRAM_ID, // program id
			tokenAccount.address, // source token account
			tokenAccount.address, // destination token account
			keypair.publicKey, // owner account pubkey
			[], // creators (for multisign)
			1 // amount
		)
	);

	// Sign transaction, broadcast, and confirm
	await web3
		.sendAndConfirmTransaction(connection, transaction, [keypair], {
			commitment: 'confirmed',
		})
		.then((signature) => {
			console.log('txid: %s', signature);
			console.log('tokenAccount: %s', tokenAccount.address.toBase58());
			console.log('mint: %s', mint.publicKey.toBase58());
		});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
