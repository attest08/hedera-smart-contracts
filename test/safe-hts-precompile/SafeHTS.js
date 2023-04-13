const { expect } = require("chai");
const { ethers } = require("hardhat");
const utils = require('../hts-precompile/utils');

describe.only("SafeHTS library Test Suite", function () {
  let safeOperationsContract;
  let fungibleTokenAddress;
  let nonFungibleTokenAddress;
  let safeViewOperationsContract;
  let signers;
  const nftSerial = "0x01"
  const operatorId = '0.0.2'
  const operatorKey = '302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137'

  before(async function () {
    safeOperationsContract = await deploySafeOperationsContract();
    console.log('safeOperationsContract: ' + safeOperationsContract.address);

    safeViewOperationsContract = await deploySafeViewOperationsContract();
    console.log('safeViewOperationsContract: ' + safeViewOperationsContract.address);
    signers = await ethers.getSigners();

    fungibleTokenAddress = await createFungibleToken();
    console.log(fungibleTokenAddress)

    nonFungibleTokenAddress = await createNonFungibleToken();
    console.log(nonFungibleTokenAddress)

  });

  async function deploySafeOperationsContract() {
    const safeOperationsFactory = await ethers.getContractFactory("SafeOperations");
    const safeOperations = await safeOperationsFactory.deploy({ gasLimit: 10_000_000 });
    const safeOperationsReceipt = await safeOperations.deployTransaction.wait();

    return await ethers.getContractAt('SafeOperations', safeOperationsReceipt.contractAddress);
  }

  async function deploySafeViewOperationsContract() {
    const safeOperationsFactory = await ethers.getContractFactory("SafeViewOperations");
    const safeOperations = await safeOperationsFactory.deploy({ gasLimit: 10_000_000 });
    const safeOperationsReceipt = await safeOperations.deployTransaction.wait();

    return await ethers.getContractAt('SafeViewOperations', safeOperationsReceipt.contractAddress);
  }

  async function createFungibleToken() {
    const tokenAddressTx = await safeOperationsContract.safeCreateFungibleTokenPublic({
      value: ethers.BigNumber.from('20000000000000000000'),
      gasLimit: 1_000_000
    });

    const tokenAddressReceipt = await tokenAddressTx.wait();
    const tokenAddress = tokenAddressReceipt.events.filter(e => e.event === 'TokenCreated')[0].args[0];
    return tokenAddress;
  }

  async function createNonFungibleToken() {
    const tokenAddressTx = await safeOperationsContract.safeCreateNonFungibleTokenPublic({
      value: ethers.BigNumber.from('50000000000000000000'),
      gasLimit: 5_000_000
    });

    const tokenAddressReceipt = await tokenAddressTx.wait();
    const tokenAddress = tokenAddressReceipt.events.filter(e => e.event === 'TokenCreated')[0].args[0];

    return tokenAddress;
  }

  it("should be able to get token info", async function () {
    const tokenInfoTx = await safeViewOperationsContract.safeGetTokenInfoPublic(fungibleTokenAddress);
    const tokenInfoReceipt = await tokenInfoTx.wait();
    const tokenInfo = tokenInfoReceipt.events.filter(e => e.event === 'GetTokenInfo')[0].args[0];

    expect(tokenInfo.token.name).to.equal("tokenName");
    expect(tokenInfo.token.symbol).to.equal("tokenSymbol");
    expect(tokenInfo.totalSupply).to.equal(200);
  });

  it("should be able to get fungible token info", async function () {
    const fungibleTokenInfoTx = await safeViewOperationsContract.safeGetTokenInfoPublic(fungibleTokenAddress);
    const fungibleTokenInfoReceipt = await fungibleTokenInfoTx.wait();
    const fungibleTokenInfo = fungibleTokenInfoReceipt.events.filter(e => e.event === 'GetTokenInfo')[0].args[0];

    expect(fungibleTokenInfo.token.name).to.equal("tokenName");
    expect(fungibleTokenInfo.token.symbol).to.equal("tokenSymbol");
    expect(fungibleTokenInfo.totalSupply).to.equal(200);
    //check expect(fungibleTokenInfo.decimals).to.equal(8);
  });

  it("should be able to get Non fungible token info", async function () {
    const amount = 0;

    const mintedTokenInfo = await safeOperationsContract.safeMintTokenPublic(nonFungibleTokenAddress, amount, [nftSerial], { gasLimit: 1_000_000 });
    const nonFungibleTokenMintedReceipt = await mintedTokenInfo.wait();
    const nonFungibleTokeMintedInfo = nonFungibleTokenMintedReceipt.events.filter(e => e.event === "MintedNft")[0].args[0];
    expect(nonFungibleTokeMintedInfo[0]).to.equal(nftSerial)

    const nonFungibleTokenInfoTx = await safeViewOperationsContract.safeGetNonFungibleTokenInfoPublic(nonFungibleTokenAddress, nftSerial);
    const nonFungibleTokenInfoReceipt = await nonFungibleTokenInfoTx.wait();
    const nonFungibleTokenInfo = nonFungibleTokenInfoReceipt.events.filter(e => e.event === "GetNonFungibleTokenInfo")[0].args;

    expect(nonFungibleTokenInfo[0][1]).to.equal(nftSerial)

    const genesisClient = await utils.createLocalSDKClient(operatorId, operatorKey);
    const account = await utils.convertAccountIdToLongZeroAddress(await utils.getAccountId(signers[0].address, genesisClient));
    expect(nonFungibleTokenInfo[0][2]).to.equal("0x" + account.toString().toUpperCase())
  });

  it("should be able to transfer tokens and hbars atomically", async function () {
    const senderAccountID = signers[0].address
    const receiverAccountID = signers[1].address

    const amount = 0;
    const mintedTokenInfo = await safeOperationsContract.safeMintTokenPublic(nonFungibleTokenAddress, amount, [nftSerial], { gasLimit: 1_000_000 });
    const nonFungibleTokenMintedReceipt = await mintedTokenInfo.wait();
    const nonFungibleTokeMintedSerialNumbers = nonFungibleTokenMintedReceipt.events.filter(e => e.event === "MintedNft")[0].args[0];

    let signer0PrivateKey = config.networks.relay.accounts[0];
    console.log(signer0PrivateKey)
    await utils.associateWithSigner(signer0PrivateKey, fungibleTokenAddress, operatorId, operatorKey);
   // await utils.associateWithSigner(signer0PrivateKey, nonFungibleTokenAddress, operatorId, operatorKey);
    let signer1PrivateKey = config.networks.relay.accounts[1];
    console.log(signer1PrivateKey)
    await utils.associateWithSigner(signer1PrivateKey, fungibleTokenAddress, operatorId, operatorKey);
    await utils.associateWithSigner(signer1PrivateKey, nonFungibleTokenAddress, operatorId, operatorKey);

    await safeOperationsContract.safeGrantTokenKycPublic(fungibleTokenAddress, signers[0].address);
    await safeOperationsContract.safeGrantTokenKycPublic(fungibleTokenAddress, signers[1].address);
    await safeOperationsContract.safeGrantTokenKycPublic(nonFungibleTokenAddress, signers[0].address);
    await safeOperationsContract.safeGrantTokenKycPublic(nonFungibleTokenAddress, signers[1].address);

    await safeOperationsContract.safeTransferTokenPublic(fungibleTokenAddress, safeOperationsContract.address, signers[0].address, 100);
   
    const transferList = {
      transfers: [
        {
          accountID: senderAccountID,
          amount: -10_000
        },
        {
          accountID: receiverAccountID,
          amount: 10_000
        }
      ]
    };

    //nft and token transfer
    const tokenTransferList = [{
      token: nonFungibleTokenAddress,
      transfers: [],
      nftTransfers: [{
        senderAccountID: senderAccountID,
        receiverAccountID: receiverAccountID,
        serialNumber: nonFungibleTokeMintedSerialNumbers[0],
      }],
    },
    {
      token: fungibleTokenAddress,
      transfers: [
        {
          accountID: receiverAccountID,
          amount: 10,
        },
        {
          accountID: senderAccountID,
          amount: -10,
        },
      ],
      nftTransfers: [],
    }];

    const cryptoTransferTx = await safeOperationsContract.safeCryptoTransferPublic(transferList, tokenTransferList);
    const cryptoTransferReceipt = await cryptoTransferTx.wait()
    expect(cryptoTransferReceipt.events.filter(e => e.event === 'ResponseCode')[0].args[0]).to.equal(22);
//add expects before and after transfer
//amount of the hbar for signer0 and signer1
//amount of the fungible token signer0 and signer1
//signer0 should be 100
//owner of nft1 should be signer0 before the transfer
//after transfer hbars of the signer0 to be less with 10 000
//signer1 to be + 10 000
//ft signer0 -10 
//ft signer1 to be +10
//expect owner nft after transfer to be signer1
ethers.provider.getBalance(signer0.address)
//new contract
const newContract = ethers.getContractAt("ERC20Mock", fungibleTokenAddress) 
let ftBalance = await newContract.balanceOf(signer0.address) //balance of fungible token expexted 10

//Owner of fungibleToken 
const nftMockContract =  ethers.getContractAt("ERC721Mock", nonFungibleTokenAddress) 
nftMockContract.ownerOf(nonFungibleTokenAddress, nftSerial)
  });
});
