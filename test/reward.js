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
const FOUR = BigNumber.from('4');
const FIVE = BigNumber.from('5');
const SIX = BigNumber.from('6');
const SEVEN = BigNumber.from('7');
const EIGHT = BigNumber.from('8');
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const FRACTION = BigNumber.from('100000');


chai.use(require('chai-bignumber')());

describe("reward", async() => {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];

    const SERIES_ID = BigNumber.from('100');
    const PRICE = ethers.utils.parseEther('1');

    // vars
    var reward, impactCoin, community, nft, mockBonusCaller, erc20;
    var nftState, nftView, mockCostManager;


    const roles = [
        ["role100", PRICE.mul(ONE)],
        ["role200", PRICE.mul(TWO)],
        ["role300", PRICE.mul(THREE)],
        ["role400", PRICE.mul(FOUR)],
        ["role500", PRICE.mul(FIVE)],
        ["role600", PRICE.mul(SIX)],
        ["role700", PRICE.mul(SEVEN)],
        ["role800", PRICE.mul(EIGHT)],
        ["role900", PRICE.mul(NINE)],
        ["role1000", PRICE.mul(TEN)]
    ];

    beforeEach("deploying", async() => {
        const ImpactCoinFactory = await ethers.getContractFactory("ImpactCoin");
        impactCoin = await ImpactCoinFactory.connect(owner).deploy();

        const RewardFactory = await ethers.getContractFactory("Reward");
        reward = await RewardFactory.connect(owner).deploy();

        erc20 = await ImpactCoinFactory.connect(owner).deploy();

        // setting up nft
        const MockNFTFactory = await ethers.getContractFactory("MockNFT");
        let nftImpl = await MockNFTFactory.connect(owner).deploy();
        const MockNFTFactoryFactory = await ethers.getContractFactory("MockNFTFactory");
        nftFactory = await MockNFTFactoryFactory.connect(owner).deploy(nftImpl.address, ZERO_ADDRESS);

        let tx = await nftFactory.connect(owner)["produce(string,string,string)"]("NFT Edition", "NFT", "");
        let receipt = await tx.wait();
        let instanceAddr = receipt['events'][0].args.instance;
        nft = await MockNFTFactory.connect(owner).attach(instanceAddr);

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

    it("should update nft settings after deploy", async() => {

        const oldSettings = await reward.viewSettings();
        const newCurrency = accounts[6].address; // just get any address to check. ofc it's will be invalid for further calls
        const newSeriesId = BigNumber.from('200');
        const newPrice = ethers.utils.parseEther('2');

        await reward.connect(owner).updateNftSettings(newCurrency, newSeriesId, newPrice);

        const newSettings = await reward.viewSettings();

        await expect(newCurrency).to.be.eq(newSettings.nft.currency);
        await expect(newSeriesId).to.be.eq(newSettings.nft.seriesId);
        await expect(newPrice).to.be.eq(newSettings.nft.price);
        
    });

    it("should update updateCommunitySettings after deploy", async() => {
        
        const newRoles = [
            ["role100", PRICE.mul(ONE)],
            ["role200", PRICE.mul(TWO)],
            ["role600", PRICE.mul(SIX)],
            ["role1000", PRICE.mul(TEN)]
        ];

        const oldSettings = await reward.viewSettings();

        await reward.connect(owner).updateCommunitySettings(newRoles);

        const newSettings = await reward.viewSettings();

        await expect(oldSettings.community.roles.length).not.to.be.eq(newSettings.community.roles.length);
        await expect(newRoles.length).to.be.eq(newSettings.community.roles.length);
        
    });


    it("should update nft settings by owner only", async() => {

        const newCurrency = accounts[6].address; // just get any address to check. ofc it's will be invalid for further calls
        const newSeriesId = BigNumber.from('200');
        const newPrice = ethers.utils.parseEther('2');

        await expect(
            reward.connect(bob).updateNftSettings(newCurrency, newSeriesId, newPrice)
        ).to.be.revertedWith("Ownable: caller is not the owner");

    });

    it("should update updateCommunitySettings by owner only", async() => {

        const newRoles = [
            ["role100", PRICE.mul(ONE)],
            ["role200", PRICE.mul(TWO)],
            ["role600", PRICE.mul(SIX)],
            ["role1000", PRICE.mul(TEN)]
        ];

        await expect(
            reward.connect(bob).updateCommunitySettings(newRoles)
        ).to.be.revertedWith("Ownable: caller is not the owner");

    });

    it("shouldnt call bonus method anyone except ITRx", async() => {
        await expect(
            mockBonusCaller.bonusCall(reward.address, alice.address, ONE)
        ).to.be.revertedWith("DISABLED");

    });

    for (const tokenMode of [false,true]) {

    describe("reward via " + `${tokenMode ? "token" : "eth"}`, async() => {
        var expectedTokenId = SERIES_ID.mul(TWO.pow(BigNumber.from('192'))).add(ZERO);;
        const now = Math.round(Date.now() / 1000);   
        const baseURI = "";
        const suffix = ".json";
        const saleParams = [
            now + 100000, 
            tokenMode ? erc20.address : ZERO_ADDRESS, 
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

        beforeEach("deploying", async() => {
            // grant role "BONUS_CALLER" to contract shich try to call reward contracts methods
            await reward.connect(owner).grantRole(
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BONUS_CALLER")), // "BONUS_CALLER"
                mockBonusCaller.address
            );

            // make settings for NFT /// setSeriesInfo
            
            
            await nft.connect(owner).setSeriesInfo(SERIES_ID, seriesParams);

            if (tokenMode) {
                await erc20.connect(owner).mint(PRICE.mul(HUN));
            }
            
            
        });

        it("check minting in ImpactCoin", async() => {

            const balanceBefore = await impactCoin.balanceOf(bob.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE, {value: PRICE});
            const balanceAfter = await impactCoin.balanceOf(bob.address);
            expect(balanceAfter.sub(balanceBefore)).to.be.eq(PRICE);
        });

        it("should mint NFT", async() => {

            // ////////////////////////////////////////////////////////////
            
            // token does not exists, but token's owner is a author of series
            await expect(
                nft.ownerOf(expectedTokenId)
            ).to.be.revertedWith("ERC721: owner query for nonexistent token");
            const tokenSaleInfoBefore = await nft.getTokenSaleInfo(expectedTokenId);
            expect(tokenSaleInfoBefore.owner).to.be.equal(alice.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE, {value: PRICE});

            ////
            // const tokenSaleInfoAfter = await nft.getTokenSaleInfo(expectedTokenId);
            // expect(tokenSaleInfoAfter.owner).to.be.equal(bob.address);
            const ownerAfter = await nft.ownerOf(expectedTokenId);
            expect(ownerAfter).to.be.equal(bob.address);
            
        });

        it("check role", async() => {
  
            let userRoles;
            // in beginning user have zero roles
            userRoles = await community["getRoles(address[])"]([bob.address]);
            //expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(ZERO);

            // make donation for the one first role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make donation to obtain next role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(false);
            expect(userRoles.includes("role200")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make several donations to skip several roles and obtain to 
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});

            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(false);
            expect(userRoles.includes("role200")).to.be.eq(false);
            expect(userRoles.includes("role300")).to.be.eq(false);
            expect(userRoles.includes("role400")).to.be.eq(false);
            expect(userRoles.includes("role500")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make several donations to and obtain the last role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});

            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            userRoles = await community["getRoles(address[])"]([bob.address]);

            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(false);
            expect(userRoles.includes("role200")).to.be.eq(false);
            expect(userRoles.includes("role300")).to.be.eq(false);
            expect(userRoles.includes("role400")).to.be.eq(false);
            expect(userRoles.includes("role500")).to.be.eq(false);
            expect(userRoles.includes("role600")).to.be.eq(false);
            expect(userRoles.includes("role700")).to.be.eq(false);
            expect(userRoles.includes("role800")).to.be.eq(false);
            expect(userRoles.includes("role900")).to.be.eq(false);
            expect(userRoles.includes("role1000")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            const newRoles = [
                ["role1000", PRICE.mul(ONE)],
                ["role600", PRICE.mul(TWO)],
                ["role200", PRICE.mul(SIX)],
                ["role100", PRICE.mul(TEN)]
            ];

            await reward.connect(owner).updateCommunitySettings(newRoles);
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE), {value: PRICE.mul(ONE)});
            userRoles = await community["getRoles(address[])"]([bob.address]);


            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(true);
            expect(userRoles.includes("role900")).to.be.eq(false);
            expect(userRoles.includes("role1000")).to.be.eq(false);

        });
    });

    }
    
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});
    //it("test", async() => {});

});