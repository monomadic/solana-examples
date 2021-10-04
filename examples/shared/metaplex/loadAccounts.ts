// import {
//   getEdition,
//   getMultipleAccounts,
//   MAX_CREATOR_LEN,
//   MAX_CREATOR_LIMIT,
//   MAX_NAME_LENGTH,
//   MAX_SYMBOL_LENGTH,
//   MAX_URI_LENGTH,
//   Metadata,
//   METADATA_PREFIX,
//   ParsedAccount,
// } from '@oyster/common';
// import { METADATA_PROGRAM_ID, METAPLEX_ID, StringPublicKey, toPublicKey } from '@oyster/common/dist/lib/utils/ids';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';

import { StringPublicKey } from '../common';
import { getMultipleAccounts, ParsedAccount } from './account';
import { METADATA_PROGRAM_ID, METAPLEX_ID, toPublicKey } from './common';
import { getAllCollectibles } from './loadNFTs';
import {
  getEdition,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
  Metadata,
  METADATA_PREFIX,
} from './metadata';
import { MAX_WHITELISTED_CREATOR_SIZE } from './models/metaplex';
import { processMetaData } from './processMetaData';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { AccountAndPubkey, MetaState, ProcessAccountsFunc } from './types';

// import { auctions } from './data.js';
async function getProgramAccounts(
	connection: Connection,
	programId: StringPublicKey,
	configOrCommitment?: any,
	wallets: Array<string> = []
): Promise<Array<AccountAndPubkey>> {
	const extra: any = {};
	let commitment;
	let encoding;
	if (programId === METADATA_PROGRAM_ID) {
		// return metav1Accounts.map(item => {
		//   return {
		//     account: {
		//       // TODO: possible delay parsing could be added here
		//       data: Buffer.from(item.account.data[0], 'base64'),
		//       // data: item.account.data,
		//       executable: item.account.executable,
		//       lamports: item.account.lamports,
		//       // TODO: maybe we can do it in lazy way? or just use string
		//       owner: item.account.owner,
		//     } as unknown as AccountInfo<Buffer>,
		//     pubkey: item.pubkey,
		//   };
		// });
		const nfts: AccountAndPubkey[][] = await getAllCollectibles(connection, wallets);
		console.log('nfts', nfts);
		return nfts.flat();
	}
	// if(programId === METAPLEX_ID){
	//   return metaplexId.map(item => {
	//     return {
	//       account: {
	//         // TODO: possible delay parsing could be added here
	//         data: Buffer.from(item.account.data[0], 'base64'),
	//         executable: item.account.executable,
	//         lamports: item.account.lamports,
	//         // TODO: maybe we can do it in lazy way? or just use string
	//         owner: item.account.owner,
	//       } as unknown as AccountInfo<Buffer>,
	//       pubkey: item.pubkey,
	//     };
	//   });
	// }
	// if(programId === AUCTION_ID){
	//   return metaplexId.map(item => {
	//     return {
	//       account: {
	//         // TODO: possible delay parsing could be added here
	//         data: Buffer.from(item.account.data[0], 'base64'),
	//         executable: item.account.executable,
	//         lamports: item.account.lamports,
	//         // TODO: maybe we can do it in lazy way? or just use string
	//         owner: item.account.owner,
	//       } as unknown as AccountInfo<Buffer>,
	//       pubkey: item.pubkey,
	//     };
	//   });
	// }
	if (configOrCommitment) {
		if (typeof configOrCommitment === 'string') {
			commitment = configOrCommitment;
		} else {
			commitment = configOrCommitment.commitment;
			//encoding = configOrCommitment.encoding;

			if (configOrCommitment.dataSlice) {
				extra.dataSlice = configOrCommitment.dataSlice;
			}

			if (configOrCommitment.filters) {
				extra.filters = configOrCommitment.filters;
			}
		}
	}

	const args = connection._buildArgs([programId], commitment, 'base64', extra);
	const unsafeRes = await (connection as any)._rpcRequest('getProgramAccounts', args);
	console.log('unsafeRes', unsafeRes, programId);

	let array;

	// if(programId === METAPLEX_ID) {
	//   const store = unsafeRes.result.find(item => item.pubkey === "3bFeTtbfn6Xig6aZU3FTTXCKpnU1wEGYB2bKtxrhMBeE")
	//   console.log("store", store)
	// }
	// array = unsafeRes.result;
	array = unsafeRes.result;
	const data = (
		array as Array<{
			account: AccountInfo<[string, string]>;
			pubkey: string;
		}>
	).map((item) => {
		return {
			account: {
				// TODO: possible delay parsing could be added here
				data: Buffer.from(item.account.data[0], 'base64'),
				executable: item.account.executable,
				lamports: item.account.lamports,
				// TODO: maybe we can do it in lazy way? or just use string
				owner: item.account.owner,
			} as AccountInfo<Buffer>,
			pubkey: item.pubkey,
		};
	});

	return data;
}

export const loadAccounts = async (connection: Connection, all: boolean) => {
	let tempCache: MetaState = {
		metadata: [],
		metadataByMint: {},
		masterEditions: {},
		masterEditionsByPrintingMint: {},
		masterEditionsByOneTimeAuthMint: {},
		metadataByMasterEdition: {},
		editions: {},
		auctionManagersByAuction: {},
		bidRedemptions: {},
		auctions: {},
		auctionDataExtended: {},
		vaults: {},
		payoutTickets: {},
		store: null,
		whitelistedCreatorsByCreator: {},
		bidderMetadataByAuctionAndBidder: {},
		bidderPotsByAuctionAndBidder: {},
		safetyDepositBoxesByVaultAndIndex: {},
		prizeTrackingTickets: {},
		safetyDepositConfigsByAuctionManagerAndIndex: {},
		bidRedemptionV2sByAuctionManagerAndWinningIndex: {},
		stores: {},
	};
	const updateTemp = makeSetter(tempCache);

	const forEach = (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
		for (const account of accounts) {
			await fn(account, updateTemp, all);
		}
	};

	const additionalPromises: Promise<void>[] = [];

	const IS_BIG_STORE = process.env.NEXT_PUBLIC_BIG_STORE?.toLowerCase() === 'true';
	console.log(`Is big store: ${IS_BIG_STORE}`);

	const promises = [
		// getProgramAccounts(connection, VAULT_ID).then(forEach(processVaultData)),
		// getProgramAccounts(connection, AUCTION_ID).then(forEach(processAuctions)),
		// getProgramAccounts(connection, METAPLEX_ID).then(
		//   forEach(processMetaplexAccounts),
		// ),
		// IS_BIG_STORE
		//   ? getProgramAccounts(connection, METADATA_PROGRAM_ID).then(
		//       forEach(processMetaData),
		//     )
		//   : undefined,
		getProgramAccounts(connection, METAPLEX_ID, {
			filters: [
				{
					dataSize: MAX_WHITELISTED_CREATOR_SIZE,
				},
			],
		}).then(async (creators) => {
			const result = await forEach(processMetaplexAccounts)(creators);

			if (IS_BIG_STORE) {
				return result;
			}

			const whitelistedCreators = Object.values(tempCache.whitelistedCreatorsByCreator);

			if (whitelistedCreators.length > 3) {
				console.log(' too many creators, pulling all nfts in one go');
				additionalPromises.push(
					getProgramAccounts(connection, METADATA_PROGRAM_ID).then(
						forEach(processMetaData)
					)
				);
			} else {
				console.log('pulling optimized nfts');
				console.log('whitelistedCreators', whitelistedCreators);
				for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
					for (let j = 0; j < whitelistedCreators.length; j++) {
						additionalPromises.push(
							getProgramAccounts(
								connection,
								METADATA_PROGRAM_ID,
								{
									filters: [
										{
											memcmp: {
												offset:
													1 + // key
													32 + // update auth
													32 + // mint
													4 + // name string length
													MAX_NAME_LENGTH + // name
													4 + // uri string length
													MAX_URI_LENGTH + // uri
													4 + // symbol string length
													MAX_SYMBOL_LENGTH + // symbol
													2 + // seller fee basis points
													1 + // whether or not there is a creators vec
													4 + // creators vec length
													i * MAX_CREATOR_LEN,
												bytes: whitelistedCreators[j].info.address,
											},
										},
									],
								},
								whitelistedCreators.map((item) => item.info.address)
							).then(forEach(processMetaData))
							// forEach(metav1Accounts => processMetaData)
							// metav1Accounts.then(async item => processMetaData(item))
						);
					}
				}
			}
		}),
	];
	await Promise.all(promises);
	await Promise.all(additionalPromises);
	// tempCache = tempData;
	// tempCache.metadata = tempData.metadata.map(meta => {return proc});
	console.log('tempCache', tempCache);
	await postProcessMetadata(tempCache, all);
	console.log('Metadata size', tempCache.metadata.length);

	if (additionalPromises.length > 0) {
		console.log('Pulling editions for optimized metadata');
		let setOf100MetadataEditionKeys: string[] = [];
		const editionPromises: Promise<{
			keys: string[];
			array: AccountInfo<Buffer>[];
		}>[] = [];

		for (let i = 0; i < tempCache.metadata.length; i++) {
			let edition: StringPublicKey;
			if (tempCache.metadata[i].info.editionNonce != null) {
				edition = (
					await PublicKey.createProgramAddress(
						[
							Buffer.from(METADATA_PREFIX),
							toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
							toPublicKey(tempCache.metadata[i].info.mint).toBuffer(),
							new Uint8Array([tempCache.metadata[i].info.editionNonce || 0]),
						],
						toPublicKey(METADATA_PROGRAM_ID)
					)
				).toBase58();
			} else {
				edition = await getEdition(tempCache.metadata[i].info.mint);
			}

			setOf100MetadataEditionKeys.push(edition);

			if (setOf100MetadataEditionKeys.length >= 100) {
				editionPromises.push(
					getMultipleAccounts(connection, setOf100MetadataEditionKeys, 'recent')
				);
				setOf100MetadataEditionKeys = [];
			}
		}

		if (setOf100MetadataEditionKeys.length >= 0) {
			editionPromises.push(
				getMultipleAccounts(connection, setOf100MetadataEditionKeys, 'recent')
			);
			setOf100MetadataEditionKeys = [];
		}

		const responses = await Promise.all(editionPromises);
		for (let i = 0; i < responses.length; i++) {
			const returnedAccounts = responses[i];
			for (let j = 0; j < returnedAccounts.array.length; j++) {
				processMetaData(
					{
						pubkey: returnedAccounts.keys[j],
						account: returnedAccounts.array[j],
					},
					updateTemp,
					all
				);
			}
		}
		console.log(
			'Edition size',
			Object.keys(tempCache.editions).length,
			Object.keys(tempCache.masterEditions).length
		);
	}

	return tempCache;
};

export const makeSetter =
	(state: MetaState) => (prop: keyof MetaState, key: string, value: ParsedAccount<any>) => {
		if (prop === 'store') {
			state[prop] = value;
		} else if (prop !== 'metadata') {
			state[prop][key] = value;
		}
		return state;
	};

const postProcessMetadata = async (tempCache: MetaState, all: boolean) => {
	const values = Object.values(tempCache.metadataByMint);

	for (const metadata of values) {
		await metadataByMintUpdater(metadata, tempCache, all);
	}
};

export const metadataByMintUpdater = async (
	metadata: ParsedAccount<Metadata>,
	state: MetaState,
	all: boolean
) => {
	const key = metadata.info.mint;
	// if (
	//   isMetadataPartOfStore(
	//     metadata,
	//     state.store,
	//     state.whitelistedCreatorsByCreator,
	//     all,
	//   )
	// ) {
	// console.log("metadata", metadata);
	// const Meta = ParsedAccount<Metadata>(metadata.info);
	await metadata.info.init();
	const masterEditionKey = metadata.info?.masterEdition;
	if (masterEditionKey) {
		state.metadataByMasterEdition[masterEditionKey] = metadata;
	}
	// console.log("metadata", metadata);
	state.metadataByMint[key] = metadata;
	state.metadata.push(metadata);
	// }
	// else {
	//   // delete state.metadataByMint[key];
	// }
	return state;
};

const response = {
	jsonrpc: '2.0',
	result: {
		context: {
			slot: 80351528,
		},
		value: [
			{
				account: {
					data: [
						'Zs5r/XJwIisrXykxQHIInnrgNigHyJSZeVx7BHcc4Lhy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAACJjCBVLeJXCtSMy+tjJIMs4yqHf94t0HdM0/L9DJnm3AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'HSPECtRovMr7GPA1EcJXU184YKH9xReRQHeSupzE2dvH',
			},
			{
				account: {
					data: [
						'SGmH7RqzmqmrxiQqvCTullZhfZeFVQZX8ITpGHzoUeZy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '6oMvbCtRfQKNjKmSW3nykK61dakNSddWtd2kdvsgGB2F',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAFEcSZlI1jQtGvy5vc5bmxtxr7I6K0EWcTZJEnQ4TWLnAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '2xfPuKoWdZzwgdohtkFjjaNzw79WGWS9TjXExMMvRk6Q',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAGVIzGSuIfSvVqytEM91BHh06UKspjnbG7lv3tiiZaUWAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '2nCwyY2TaeYW6mzUcoiHjMe9K65Y2qA1DHnUdcFaz9sE',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAEXptkZbz3oTDQqcxUIUgeR+CnSjRw+XL6tPu7nY9I/8AQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '78NqpKfsCDFQURi7ptmvkyw6H9Y7i7aisi3EUkg2swh5',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAJJMM2+i3wVBNFFaXOZStSpKp7Pavkr/0RMhexdhyT8gAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'BkYHaLJF4wiFgbdvDLjLm8pMauUZrLNx3E5vhPErtxPb',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAANkSJz9Rw8tL+6BLCdZI1TPyzkwp2PRUYf6Sqw8a6rreAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '7Vs7iWPLYL48q2gWdhjn4AaGqivKcPBvTSD5v32E1DgJ',
			},
			{
				account: {
					data: [
						'7uyOVwE8k8mU74PJRY844weg4lpMH6ESZc00X90UnPBy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAFbhRlfJar7PMAIBMQF/KSxaja/N/mNGzrPMTgokeXVEAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'Dc8g7HTwBLbLktDnhufgwG75y6Luwo2XbtHNUcyrQHvA',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAACJjCBVLeJXCtSMy+tjJIMs4yqHf94t0HdM0/L9DJnm3AQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'BeyR7Aju9onAWkNkCiB5hrNxAEutMnTWvtW5Qg7vAaPY',
			},
			{
				account: {
					data: [
						'd1LDt2N9ZOBhKzEDbO0GB2PxarvOqzq4ilcYWvx3/INy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAADSRCKuKXyfaGrhtjMY7OabUCTH0wZTEpCg1j2zxOx1iAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'DFCRcRaFEWY2fYanGyZAZ7iZ59wfWQBfSSwCMULv4TMt',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAFbhRlfJar7PMAIBMQF/KSxaja/N/mNGzrPMTgokeXVEAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '2wkN4qUhwwczMKy5Ur5pZk63PQGP3qLrwG43QNRmHZXg',
			},
			{
				account: {
					data: [
						'Ke/aFtDfA0JRPiVSmPZx2QF3/9vuU989NQqw0LbfbOhy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAEYBvupAVvpMy/UabA1tzjsPUPaa2BB08U4a1bOUSKFaAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '31VHVY4nu4EqxSsh38S75ykyahQUCQTzHS6uSkJfB6Pv',
			},
			{
				account: {
					data: [
						'+p8hRsPW7bkp+zF51FdN/6gDYYys228GgvKwRKqipcdy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAEU58ZIcTxuz9tYNDODhByHp/WIB1Ptmlrpik3GK8PHvAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'EhVJL1kTTXxKVk9RxgwovHb97uHKKCC1KAGqNvccBrZu',
			},
			{
				account: {
					data: [
						'z/cpO0puSmiiYlObezwYZyQqbMEorFbEW24+Puawn3dy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'FRbgPQHbf9Ncm11AfKEGgj7FUgSD6fCnz284kQUWv1NY',
			},
			{
				account: {
					data: [
						'vvwKsbXLZ3sbs0Z78nSKbreAFV9zoNhZ9Gq2tcTSsZty4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'GYBQh4Y3yP6gH9n7Kr4GmTFAyzNw7JYRMuZGVxwNpGTP',
			},
			{
				account: {
					data: [
						'0EZ/LtV3lD4xYmeX1JvVBLOY0KKRI7vI+XF4OZUAGk1y4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAEeA+rQQ4zO38ItMduPiTp+sMSAJta8kl+mQv7gb5STCAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'FQ7bCgvsdCCaCEcGBX9kgX7oEJAUZ5Y4Ryf3bVW6FZqw',
			},
			{
				account: {
					data: [
						'75KH2ltGXCpeiLU6nUNHc31gsJ0vcvVu3W3qnmkbgB1y4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'CJknR3nEyETarz99F45bv8hM5bErnNzSRmDvoZ4Y39yL',
			},
			{
				account: {
					data: [
						'5IrB6Dp+id0t9CrFC8Bg56NpzYWasLhCYJVheXP5kS1y4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAJ1BL+mF0w5TClbV02jdDYKWPEAveNXzTTvxY5grwBhBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '9vPzjEEU9gNb2FVXVjjdgFQeQ2hQetxcy7cQ3SH29L16',
			},
			{
				account: {
					data: [
						'P9D8WZMZSpxP3IS5cJCTPBlYumU500I8RwaQhgumdhVy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAANkSJz9Rw8tL+6BLCdZI1TPyzkwp2PRUYf6Sqw8a6rreAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'DgJmkaXizJSxNaUASDai25kfPH2q2wGLwgPqpUNB4ikj',
			},
			{
				account: {
					data: [
						'zz6k962ClQ7qbwkUskACRXsmoZstuTMq+8oB2N8NqIRy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAGVIzGSuIfSvVqytEM91BHh06UKspjnbG7lv3tiiZaUWAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'FJkoXqTuvJ2WTQGGuoAByCGF8k3pEM6dk3yQQKJJzAFT',
			},
			{
				account: {
					data: [
						'cToF5pqUY55jRAkwqMxcwcrBo6cFXucRnkpJnqatsVly4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAEXptkZbz3oTDQqcxUIUgeR+CnSjRw+XL6tPu7nY9I/8AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '2FWtk9LUNgD8n1zwrfoLRpRuYFJokNtXB7ndXKheW2P8',
			},
			{
				account: {
					data: [
						'9lmPpNyyNjMXtql4xfi6QO8GxuFT29mlZbjCRmgh8Nty4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAJJMM2+i3wVBNFFaXOZStSpKp7Pavkr/0RMhexdhyT8gAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'FZS7ikDox7cgknNVaERRNL9Egep91dJ8GVCaAeuAzAzC',
			},
			{
				account: {
					data: [
						'wTR4N6IIcQAqACnM0XvRz/CAW5CbLSiW9a6TpaWNWgZy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '9toBEkKm9B8k6jDu7VM3M5aFwWiyUGecLpc3AP1N1VNz',
			},
			{
				account: {
					data: [
						'xLTnGEFU1Nk++RaZdkmGNvuRy/W4ESg5AJyal/NRhHFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '76M2EEMoy8Uvc7VnYY22LsrWwJeqnx3ddPKEKqpHKKjo',
			},
			{
				account: {
					data: [
						'GrKs7VHqwJ/rgaAmOqf0PTrEC5BUsnWSNf3MNkdUeUty4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAFEcSZlI1jQtGvy5vc5bmxtxr7I6K0EWcTZJEnQ4TWLnAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'bigw8tKnWksvgAJPpFwhUscTKon4oVe8WFbc7JVQm3b',
			},
			{
				account: {
					data: [
						'LwNvsASSPIvPasnohSses2enMlLJC4OgXeOxenZct0py4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwAAAAAAAAAAAAAAAGMydK6riuq1jRs+g75qQhJhKCfRNfLiNLwYNmX2yX7CAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: '2WiiSBJ5Fjo3N52Qr3jHzJRnA3dqFpyx3jNoRPocBMx2',
			},
			{
				account: {
					data: [
						'D/z7gELo/Nx16oaUcXH1w2Ocn+/pKhfjbBUnWN3hgUBy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 2039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'FZVC27TsYjetVYumKFeXqSR36cyQjSY7HboJu6kVAxcK',
			},
			{
				account: {
					data: [
						'BpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAFy4hj7v7ssna24mMcd1gEdn0qgBu1ibJB/YsqaKgcfYwDh9QUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAADwHR8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
						'base64',
					],
					executable: false,
					lamports: 102039280,
					owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					rentEpoch: 185,
				},
				pubkey: 'CxbaSpwUDAtswALfSJ44DEFZsfPTm6j64WXBsJb6Pgkn',
			},
		],
	},
	id: '03670eec-f246-4600-9a13-2b60d7b1f589',
};
