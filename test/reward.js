const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time, constants } = require('@openzeppelin/test-helpers');

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

async function getBalance(account) {
    return await waffle.provider.getBalance(account);
}

describe("reward", async() => {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];

    const SERIES_ID = BigNumber.from('100');
    const PRICE = ethers.utils.parseEther('1');
    //const PRICE = BigNumber.from('1000000000000000000');;

    const THREE_DAYS = 3*24*60*60;
    const SEVEN_DAYS = 7*24*60*60;
    const TEN_DAYS = 7*24*60*60;
    const MULTIPLIER = 3;

    // vars
    var reward, impactCoin, community, nft, mockBonusCaller, erc20;
    var nftState, nftView, mockCostManager, mockStakingPool;

    var initialBlockTimestamp;

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

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        initialBlockTimestamp = block.timestamp;

        const ImpactCoinFactory = await ethers.getContractFactory("ImpactCoin");
        impactCoin = await ImpactCoinFactory.connect(owner).deploy();

        const RewardFactory = await ethers.getContractFactory("Reward");
        reward = await RewardFactory.connect(owner).deploy();

        erc20 = await ImpactCoinFactory.connect(owner).deploy();

        // setting up nft
        const MockNFTFactory = await ethers.getContractFactory("MockNFT");
        let nftImpl = await MockNFTFactory.connect(owner).deploy();
        const MockNFTFactoryFactory = await ethers.getContractFactory("MockNFTFactory");
        nftFactory = await MockNFTFactoryFactory.connect(owner).deploy(nftImpl.address, constants.ZERO_ADDRESS);

        let tx = await nftFactory.connect(owner)["produce(string,string,string)"]("NFT Edition", "NFT", "");
        let receipt = await tx.wait();
        let instanceAddr = receipt['events'][0].args.instance;
        nft = await MockNFTFactory.connect(owner).attach(instanceAddr);

        const MockCommunityFactory = await ethers.getContractFactory("MockCommunity");
        community = await MockCommunityFactory.connect(owner).deploy();

        const MockBonusCallerFactory = await ethers.getContractFactory("MockBonusCaller");
        mockBonusCaller = await MockBonusCallerFactory.connect(owner).deploy();
        
        let impactSettings = [
            impactCoin.address,
            [
                [initialBlockTimestamp+TEN_DAYS, TEN*FRACTION],
                [initialBlockTimestamp+SEVEN_DAYS, MULTIPLIER*FRACTION], // after 2 days user will obtain in MULTIPLIER times more
                [initialBlockTimestamp+THREE_DAYS, ONE*FRACTION]
            ] // empty multipliers
        ];
        let nftSettings = [
            nft.address,    // NFT token;
            constants.ZERO_ADDRESS,   // address currency;
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
            impactSettings,     //ImpactSettings memory impactSettings,
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

    describe("donation", async() => {
        var erc20, erc777;
        beforeEach("deploying", async() => {
            const ERC20F = await ethers.getContractFactory("MockERC20Mintable");
            const ERC777F = await ethers.getContractFactory("MockERC777Mintable");

            erc20 = await ERC20F.connect(owner).deploy();
            erc777 = await ERC777F.connect(owner).deploy();
        });

        it("should add to whitelist", async() => {
            await expect(
                reward.connect(alice).whitelistAdd(erc20.address, ZERO, ZERO)
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                reward.connect(owner).whitelistAdd(constants.ZERO_ADDRESS, ZERO, ZERO)
            ).to.be.revertedWith("not allowed");

            let tokenExists, availableAmount, ratio;

            [tokenExists, availableAmount, ratio] = await reward.connect(alice).whitelistExists(erc20.address)
            expect(tokenExists).to.be.eq(false);

            await reward.connect(owner).whitelistAdd(erc20.address, ZERO, ZERO);

            [tokenExists, availableAmount, ratio] = await reward.connect(alice).whitelistExists(erc20.address)
            expect(tokenExists).to.be.eq(true);

        });
        
        it("shouldn't donate if token not in whitelist ", async() => {
            await expect(
                reward.connect(alice).donate(constants.ZERO_ADDRESS, PRICE, {value: PRICE})
            ).to.be.revertedWith("not in whitelist");

            await expect(
                reward.connect(alice).donate(erc20.address, PRICE, {value: PRICE})
            ).to.be.revertedWith("not in whitelist");
        });

        it("should donate tokens ", async() => {
            await reward.connect(owner).whitelistAdd(erc20.address, ONE, ONE);
            await erc20.connect(owner).mint(alice.address, PRICE.mul(TWO));

            const balanceBefore = await erc20.balanceOf(reward.address);
            // send via method `donate`
            await erc20.connect(alice).approve(reward.address, PRICE);
            await reward.connect(alice).donate(erc20.address, PRICE);

            const balanceAfter = await erc20.balanceOf(reward.address);

            expect(balanceAfter.sub(balanceBefore)).to.be.eq(PRICE);

            // send directly 
            await erc20.connect(alice).transfer(reward.address, PRICE);
            const balanceAfter2 = await erc20.balanceOf(reward.address);

            expect(balanceAfter2.sub(balanceAfter)).to.be.eq(PRICE);

        });

        
        // it("should claim tokens after staking as reward", async() => {});
        //it("should ", async() => {});
    });

    for (const tokenMode of [false,true]) {

    describe("reward via " + `${tokenMode ? "token" : "eth"}`, async() => {
        var expectedTokenId = SERIES_ID.mul(TWO.pow(BigNumber.from('192'))).add(ZERO);;
        const now = Math.round(Date.now() / 1000);   
        const baseURI = "";
        const suffix = ".json";
        const saleParams = [
            now + 100000, 
            tokenMode ? erc20.address : constants.ZERO_ADDRESS, 
            PRICE,
        ];
        const commissions = [
            ZERO,
            constants.ZERO_ADDRESS
        ];
        const seriesParams = [
            alice.address,  
            10000,
            saleParams,
            commissions,
            baseURI,
            suffix
        ];

        var poolTradedTokenERC20;
        var poolDuration;
        beforeEach("deploying", async() => {
            
            const ERC20F = await ethers.getContractFactory("MockERC20Mintable");

            poolTradedTokenERC20 = await ERC20F.connect(owner).deploy();
            poolDuration = 365; //1year   //24*60*60; // 1 day in seconds

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

            // setting trusted forwarder
            await nft.connect(owner).setTrustedForwarder(reward.address);
            
            await mockBonusCaller.setVars(poolTradedTokenERC20.address, poolDuration);
        });

        it("check minting in ImpactCoin", async() => {

            const balanceBefore = await impactCoin.balanceOf(bob.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE);
            const balanceAfter = await impactCoin.balanceOf(bob.address);
            expect(balanceAfter.sub(balanceBefore)).to.be.eq(PRICE);

        });

        it("check minting in ImpactCoin (10% to invitedBy person)", async() => {

            const bobBalanceBefore = await impactCoin.balanceOf(bob.address);
            const aliceBalanceBefore = await impactCoin.balanceOf(alice.address);

            // set invitedby
            await community.connect(owner).setInvitedByAddress(alice.address, bob.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE);

            const bobBalanceAfter = await impactCoin.balanceOf(bob.address);
            const aliceBalanceAfter = await impactCoin.balanceOf(alice.address);

            expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.eq(PRICE.sub(PRICE.div(10)));
            expect(aliceBalanceAfter.sub(aliceBalanceBefore)).to.be.eq(PRICE.div(10));


        });

        it("check minting in ImpactCoin to use multipliers", async() => {
            await ethers.provider.send('evm_increaseTime', [SEVEN_DAYS]);
            await ethers.provider.send('evm_mine');



            const balanceBefore = await impactCoin.balanceOf(bob.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE);
            const balanceAfter = await impactCoin.balanceOf(bob.address);
            expect(balanceAfter.sub(balanceBefore)).not.to.be.eq(PRICE);
            expect(balanceAfter.sub(balanceBefore)).to.be.eq(PRICE.mul(MULTIPLIER));

            
        }); 

        it("should mint NFT", async() => {

            // token does not exists, but token's owner is a author of series
            await expect(
                nft.ownerOf(expectedTokenId)
            ).to.be.revertedWith("ERC721: owner query for nonexistent token");
            const tokenSaleInfoBefore = await nft.getTokenSaleInfo(expectedTokenId);
            expect(tokenSaleInfoBefore.owner).to.be.equal(alice.address);
            // imitation
            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE);

            ////
            // const tokenSaleInfoAfter = await nft.getTokenSaleInfo(expectedTokenId);
            // expect(tokenSaleInfoAfter.owner).to.be.equal(bob.address);
            const ownerAfter = await nft.ownerOf(expectedTokenId);
            expect(ownerAfter).to.be.equal(bob.address);
            
        });

        it("check rewards", async() => {
            
            const extraBonus = ethers.utils.parseEther('0.0001');
            const ratio = ONE.mul(FRACTION);
            // ratio = x1, extra = 0.0001 eth per per seconds after over poolDuration, poolDuration = 1 year
            await reward.connect(owner).whitelistAdd(poolTradedTokenERC20.address, FRACTION, extraBonus);
            // ////////////////////////////////////////////////////////////
            // imitation
            const timestamp_starting = (await hre.ethers.provider.getBlock("latest")).timestamp;
            const timestamp_when_starting_calc_extraToken = BigNumber.from(
                                                Math.floor((timestamp_starting+1)/(86400))*(86400)
                                            ).add(poolDuration*86400);

            await mockBonusCaller.connect(alice).bonusCall(reward.address, bob.address, PRICE);

            await ethers.provider.send('evm_increaseTime', [(200+165+365)*24*60*60]);
            await ethers.provider.send('evm_mine');

            const available_after_2_years = await reward.connect(alice).getMinimum(poolTradedTokenERC20.address, bob.address);
            const timestamp_after_2_years = (await hre.ethers.provider.getBlock("latest")).timestamp;
            const expected_after_2_years = (
                PRICE.mul(ratio).div(FRACTION).add( 
                    (
                        BigNumber.from(timestamp_after_2_years).sub(timestamp_when_starting_calc_extraToken)
                        
                    ).mul(extraBonus) 
                )
            );

            expect(available_after_2_years).to.be.eq(expected_after_2_years);
        
            await expect(
                reward.connect(bob).claim()
            ).to.be.revertedWith("insufficient funds");

            // mint more in two times
            await poolTradedTokenERC20.mint(reward.address, available_after_2_years.mul(TWO));

            const timestamp_latest = (await hre.ethers.provider.getBlock("latest")).timestamp;
            const expected_latest = (
                PRICE.mul(ratio).div(FRACTION).add( 
                    (
                        (BigNumber.from(timestamp_latest))
                            .sub(timestamp_when_starting_calc_extraToken)
                            .add(1)
                            // plus 1 seconds need to get future block timestamp in chain
                    ).mul(extraBonus) 
                )
            );

            const balanceBefore = await poolTradedTokenERC20.balanceOf(bob.address);
            await reward.connect(bob).claim();
            const balanceAfter = await poolTradedTokenERC20.balanceOf(bob.address);

            expect(expected_latest).to.be.eq(balanceAfter.sub(balanceBefore));

        });

        it("check role", async() => {
  
            let userRoles;
            // in beginning user have zero roles
            userRoles = await community["getRoles(address[])"]([bob.address]);
            //expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(ZERO);

            // make donation for the one first role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make donation to obtain next role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(false);
            expect(userRoles.includes("role200")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make several donations to skip several roles and obtain to 
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));

            userRoles = await community["getRoles(address[])"]([bob.address]);
            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(false);
            expect(userRoles.includes("role200")).to.be.eq(false);
            expect(userRoles.includes("role300")).to.be.eq(false);
            expect(userRoles.includes("role400")).to.be.eq(false);
            expect(userRoles.includes("role500")).to.be.eq(true);
            expect(userRoles.length).to.be.eq(TWO);

            // make several donations to and obtain the last role
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));

            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
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
            await mockBonusCaller.connect(owner).bonusCall(reward.address, bob.address, PRICE.mul(ONE));
            userRoles = await community["getRoles(address[])"]([bob.address]);


            expect(userRoles.includes("members")).to.be.eq(true);
            expect(userRoles.includes("role100")).to.be.eq(true);
            expect(userRoles.includes("role900")).to.be.eq(false);
            expect(userRoles.includes("role1000")).to.be.eq(false);

        });
    });

    }
    
    

    

});