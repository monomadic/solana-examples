const web3 =  require("@solana/web3.js");

(async () => {
  const web3 =  require("@solana/web3.js");

  // Connect to cluster
  const connection = new web3.Connection(
    web3.clusterApiUrl('devnet'),
    'confirmed',
  );
  // console.log(connection) Uncomment this to test if your connection is working
})

console.log("done");
