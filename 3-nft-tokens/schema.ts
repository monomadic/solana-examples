export class Creator {
    address: string;
    verified: boolean;
    share: number;

    constructor(args: {
        address: string;
        verified: boolean;
        share: number;
    }) {
        this.address = args.address;
        this.verified = args.verified;
        this.share = args.share;
    }
}

export class Data {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
    constructor(args: {
        name: string;
        symbol: string;
        uri: string;
        sellerFeeBasisPoints: number;
        creators: Creator[] | null;
    }) {
        this.name = args.name;
        this.symbol = args.symbol;
        this.uri = args.uri;
        this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
        this.creators = args.creators;
    }
}

export class Metadata {
    key: MetadataKey;
    updateAuthority: string;
    mint: string;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;

    // set lazy
    masterEdition?: string;
    edition?: string;

    constructor(args: {
        updateAuthority: string;
        mint: string;
        data: Data;
        primarySaleHappened: boolean;
        isMutable: boolean;
        editionNonce: number | null;
    }) {
        this.key = MetadataKey.MetadataV1;
        this.updateAuthority = args.updateAuthority;
        this.mint = args.mint;
        this.data = args.data;
        this.primarySaleHappened = args.primarySaleHappened;
        this.isMutable = args.isMutable;
        this.editionNonce = args.editionNonce;
    }

    public async init() {
        // const edition = await getEdition(this.mint);
        // this.edition = edition;
        // this.masterEdition = edition;
    }
}

export enum MetadataKey {
    Uninitialized = 0,
    MetadataV1 = 4,
    EditionV1 = 1,
    MasterEditionV1 = 2,
    MasterEditionV2 = 6,
    EditionMarker = 7,
}

export const METADATA_SCHEMA = new Map<any, any>([
    //     [
    //       CreateMetadataArgs,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['instruction', 'u8'],
    //           ['data', Data],
    //           ['isMutable', 'u8'], // bool
    //         ],
    //       },
    //     ],
    //     [
    //       UpdateMetadataArgs,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['instruction', 'u8'],
    //           ['data', { kind: 'option', type: Data }],
    //           ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
    //           ['primarySaleHappened', { kind: 'option', type: 'u8' }],
    //         ],
    //       },
    //     ],

    //     [
    //       CreateMasterEditionArgs,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['instruction', 'u8'],
    //           ['maxSupply', { kind: 'option', type: 'u64' }],
    //         ],
    //       },
    //     ],
    //     [
    //       MintPrintingTokensArgs,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['instruction', 'u8'],
    //           ['supply', 'u64'],
    //         ],
    //       },
    //     ],
    //     [
    //       MasterEditionV1,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['key', 'u8'],
    //           ['supply', 'u64'],
    //           ['maxSupply', { kind: 'option', type: 'u64' }],
    //           ['printingMint', 'pubkeyAsString'],
    //           ['oneTimePrintingAuthorizationMint', 'pubkeyAsString'],
    //         ],
    //       },
    //     ],
    //     [
    //       MasterEditionV2,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['key', 'u8'],
    //           ['supply', 'u64'],
    //           ['maxSupply', { kind: 'option', type: 'u64' }],
    //         ],
    //       },
    //     ],
    //     [
    //       Edition,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['key', 'u8'],
    //           ['parent', 'pubkeyAsString'],
    //           ['edition', 'u64'],
    //         ],
    //       },
    //     ],
    [
        Data,
        {
            kind: 'struct',
            fields: [
                ['name', 'string'],
                ['symbol', 'string'],
                ['uri', 'string'],
                ['sellerFeeBasisPoints', 'u16'],
                ['creators', { kind: 'option', type: [Creator] }],
            ],
        },
    ],
    [
        Creator,
        {
            kind: 'struct',
            fields: [
                ['address', 'pubkeyAsString'],
                ['verified', 'u8'],
                ['share', 'u8'],
            ],
        },
    ],
    [
        Metadata,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['updateAuthority', 'pubkeyAsString'],
                ['mint', 'pubkeyAsString'],
                ['data', Data],
                ['primarySaleHappened', 'u8'], // bool
                ['isMutable', 'u8'], // bool
            ],
        },
    ],
    //     [
    //       EditionMarker,
    //       {
    //         kind: 'struct',
    //         fields: [
    //           ['key', 'u8'],
    //           ['ledger', [31]],
    //         ],
    //       },
    //     ],
]);