const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time } = require('@openzeppelin/test-helpers');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const ZERO = BigNumber.from('0');
const ONE = BigNumber.from('1');
const TWO = BigNumber.from('2');
const THREE = BigNumber.from('3');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const FRACTION = BigNumber.from('100000');


chai.use(require('chai-bignumber')());

describe("reward", function () {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];

    const SERIES_ID = BigNumber.from('100');
    const PRICE = ethers.utils.parseEther('1');

    // vars
    var reward, impactCoin, community, nft, mockBonusCaller;
    var nftState, nftView, mockCostManager;
    beforeEach("deploying", async() => {
        const ImpactCoinFactory = await ethers.getContractFactory("ImpactCoin");
        impactCoin = await ImpactCoinFactory.connect(owner).deploy();

        const RewardFactory = await ethers.getContractFactory("Reward");
        reward = await RewardFactory.connect(owner).deploy();


        // setting up nft
        const MockNFTFactory = await ethers.getContractFactory("MockNFT");
        let nftImpl = await MockNFTFactory.connect(owner).deploy();
        const MockNFTFactoryFactory = await ethers.getContractFactory("MockNFTFactory");
        nftFactory = await MockNFTFactoryFactory.connect(owner).deploy(nftImpl.address, ZERO_ADDRESS);
        let tx = await nftFactory.connect(owner)["produce(string,string,string)"]("NFT Edition", "NFT", "");
        let receipt = await tx.wait();
        let instanceAddr = receipt['events'][0].args.instance;
        nft = await MockNFTFactory.attach(instanceAddr);

        const MockCommunityFactory = await ethers.getContractFactory("MockCommunity");
        community = await MockCommunityFactory.connect(owner).deploy();

        const MockBonusCallerFactory = await ethers.getContractFactory("MockBonusCaller");
        mockBonusCaller = await MockBonusCallerFactory.connect(owner).deploy();

    // struct CommunityRoles {
    //     string rolename;
    //     uint256 growcap;
    // }
    // struct CommunitySettings {
    //     CommunityRoles[] roles;
    //     Community addr;
    // }
    // struct NFTSettings {
    //     NFT token;
    //     address currency;
    //     uint64 seriesId;
    //     uint256 price;
    // }

        let nftSettings = [
            nft.address,    // NFT token;
            ZERO_ADDRESS,   // address currency;
            SERIES_ID,      // uint64 seriesId;
            PRICE           // uint256 price;
        ];
        let roles = [
            ["role100", 100],
            ["role200", 200],
            ["role300", 300],
            ["role400", 400],
            ["role500", 500],
            ["role600", 600],
            ["role700", 700],
            ["role800", 800],
            ["role900", 900],
            ["role1000", 1000]
        ]
        let masterRole = "MASTERROLE";
        let communitySettings = [
            roles,              // CommunityRoles[] roles;
            community.address   // Community addr;
        ];



        // setting up CommunityContract
        await community.connect(owner).init();
        await community.connect(owner).createRole(masterRole);
        await community.connect(owner).addMembers([reward.address]);
        await community.connect(owner).grantRoles([reward.address],["owners"]);
        
        for (let i in roles ) {
            await community.connect(owner).createRole(roles[i][0]);
            await community.connect(owner).manageRole(masterRole,roles[i][0]);
        }

        // setting up Reward
        await reward.connect(owner).init(
            impactCoin.address, //address impactCoinAddress,
            nftSettings,        //NFTSettings memory nftSettings,
            communitySettings   //CommunitySettings memory communitySettings    
        );

        // setting up impact
        await impactCoin.connect(owner).grantRole(
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("REWARD_ROLE")),
            reward.address
        );
        

    });

    it("shouldnt call bonus method anyone except ITRx", async() => {
        await expect(
            mockBonusCaller.bonusCall(reward.address, alice.address, ONE)
        ).to.be.revertedWith("DISABLED");

    });

    describe("reward", function () {
        beforeEach("deploying", async() => {

            await reward.connect(owner).grantRole(
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BONUS_CALLER")), // "BONUS_CALLER"
                mockBonusCaller.address
            );
            
        });

        it("should call bonus by ITRx", async() => {
            // imitation
// console.log('mockBonusCaller.address=',mockBonusCaller.address);
// console.log('reward.address         =',reward.address);
// console.log('alice.address          =',alice.address);
// console.log('"BONUS_CALLER"         =',ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BONUS_CALLER")));
            await mockBonusCaller.connect(alice).bonusCall(reward.address, alice.address, ONE);
        });

        it("check minting in ImpactCoin", async() => {
            const amount = ONE;
            const balanceBefore = await impactCoin.balanceOf(bob.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, amount);
            const balanceAfter = await impactCoin.balanceOf(bob.address);
            expect(balanceAfter.sub(balanceBefore)).to.be.eq(amount);
        });

        

        it("should mint NFT", async() => {
            const amount = ONE;
            //const id = seriesId.mul(TWO.pow(BigNumber.from('192'))).add(tokenId);
            const expectedTokenId = SERIES_ID.mul(TWO.pow(BigNumber.from('192'))).add(ZERO);
            const now = Math.round(Date.now() / 1000);   
            const baseURI = "";
            const suffix = ".json";
            const saleParams = [
                now + 100000, 
                ZERO_ADDRESS, 
                PRICE,
            ];
            const commissions = [
                ZERO,
                ZERO_ADDRESS
            ];
            const seriesParams = [
                alice.address,  
                10000,
                saleParams,
                commissions,
                baseURI,
                suffix
            ];
console.log('nft.address=',nft.address);
console.log('expectedTokenId=',expectedTokenId);
            await nft.connect(owner).setSeriesInfo(SERIES_ID, seriesParams);
            // ////////////////////////////////////////////////////////////
            // const tokenSaleInfoBefore = await nft.getTokenSaleInfo(expectedTokenId);
            // expect(tokenSaleInfoBefore.owner).to.be.equal(ZERO_ADDRESS);
            const ownerBefore = await nft.connect(owner).ownerOf(expectedTokenId);
// STOPPED            
//  Error: missing revert data in call exception [ See: https://links.ethers.org/v5-errors-CALL_EXCEPTION ] (error={"stackTrace":[{"type":2,"address":{"type":"Buffer","data":[136,232,234,108,62,181,225,245,191,92,43,20,147,79,99,175,36,156,240,81]}},{"type":0,"sourceReference":{"function":"ownerOf","contract":"NFTMain","sourceName":"submodu
// strange happent here


            expect(ownerBefore).to.be.equal(ZERO_ADDRESS);
            // // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, amount);
            // ////
            // const tokenSaleInfoAfter = await nft.getTokenSaleInfo(expectedTokenId);
            // expect(tokenSaleInfoAfter.owner).to.be.equal(bob.address);
            const ownerAfter = await nft.ownerOf(expectedTokenId);
            expect(ownerAfter).to.be.equal(bob.address);
        });

    });

    
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});

});