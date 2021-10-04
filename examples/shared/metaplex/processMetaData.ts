import { AccountInfo } from '@solana/web3.js';

import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  METADATA_PROGRAM_ID,
  MetadataKey,
  ParsedAccount,
  ProcessAccountsFunc,
  TOKEN_PROGRAM_ID,
} from '../metaplex';

export const processMetaData: ProcessAccountsFunc = ({ account, pubkey }, setter) => {
	// if (!isMetadataAccount(account)) return;
	if (account.owner.toString() !== METADATA_PROGRAM_ID) return;
	const metadata = decodeMetadata(account.data);
	if (metadata.updateAuthority === '8jTSV9N8r3TZ1w9wAizeNx133Dmp4e1h4f3Pyp9daZyC') {
		const parsedAccount: ParsedAccount<Metadata> = {
			pubkey,
			account,
			info: metadata,
		};
		setter('metadataByMint', metadata.mint, parsedAccount);
	} else return;
	try {
		if (!isMetadataAccount(account)) return;
		// if (account.owner == TOKEN_PROGRAM_ID) {
		//   console.log("TOKEN_PROGRAM_ID", TOKEN_PROGRAM_ID, account)
		//   const metadata = decodeMetadata(account.data);
		//   console.log("metadata", metadata.data)
		//   if (
		//     isValidHttpUrl(metadata.data.uri) &&
		//     metadata.data.uri.indexOf('arweave') >= 0
		//   ) {
		//     const parsedAccount: ParsedAccount<Metadata> = {
		//       pubkey,
		//       account,
		//       info: metadata,
		//     };
		//     setter('metadataByMint', metadata.mint, parsedAccount);
		//   }
		// }
		// if (isMetadataV1Account(account)) {
		//   const metadata = decodeMetadata(account.data);
		//   console.log("metadata", metadata)
		//   if (
		//     isValidHttpUrl(metadata.data.uri) &&
		//     metadata.data.uri.indexOf('arweave') >= 0
		//   ) {
		//     const parsedAccount: ParsedAccount<Metadata> = {
		//       pubkey,
		//       account,
		//       info: metadata,
		//     };
		//     setter('metadataByMint', metadata.mint, parsedAccount);
		//   }
		// }

		if (isEditionV1Account(account)) {
			const edition = decodeEdition(account.data);
			const parsedAccount: ParsedAccount<Edition> = {
				pubkey,
				account,
				info: edition,
			};
			setter('editions', pubkey, parsedAccount);
		}

		if (isMasterEditionAccount(account)) {
			const masterEdition = decodeMasterEdition(account.data);

			if (isMasterEditionV1(masterEdition)) {
				const parsedAccount: ParsedAccount<MasterEditionV1> = {
					pubkey,
					account,
					info: masterEdition,
				};
				setter('masterEditions', pubkey, parsedAccount);

				setter('masterEditionsByPrintingMint', masterEdition.printingMint, parsedAccount);

				setter(
					'masterEditionsByOneTimeAuthMint',
					masterEdition.oneTimePrintingAuthorizationMint,
					parsedAccount
				);
			} else {
				const parsedAccount: ParsedAccount<MasterEditionV2> = {
					pubkey,
					account,
					info: masterEdition,
				};
				setter('masterEditions', pubkey, parsedAccount);
			}
		}
	} catch {
		// ignore errors
		// add type as first byte for easier deserialization
	}
};

const isMetadataAccount = (account: AccountInfo<Buffer>) => {
	return (account.owner as unknown as any) === METADATA_PROGRAM_ID;
};

const isTokenAccount = (account: AccountInfo<Buffer>) => {
	return (account.owner as unknown as any) === TOKEN_PROGRAM_ID;
};

const isMetadataV1Account = (account: AccountInfo<Buffer>) =>
	account.data[0] === MetadataKey.MetadataV1;

const isEditionV1Account = (account: AccountInfo<Buffer>) =>
	account.data[0] === MetadataKey.EditionV1;

const isMasterEditionAccount = (account: AccountInfo<Buffer>) =>
	account.data[0] === MetadataKey.MasterEditionV1 ||
	account.data[0] === MetadataKey.MasterEditionV2;

const isMasterEditionV1 = (me: MasterEditionV1 | MasterEditionV2): me is MasterEditionV1 => {
	return me.key === MetadataKey.MasterEditionV1;
};
