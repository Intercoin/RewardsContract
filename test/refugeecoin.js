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

const ADMIN_ROLE = 'admin';
const REDEEM_ROLE = 'redeem';
const CIRCULATE_ROLE = 'circulate';

//const REDEEM_ROLE_BYTES32 = 0x72656465656d0000000000000000000000000000000000000000000000000000;

const NO_DONATIONS = [];



chai.use(require('chai-bignumber')());

describe("RefugeeCoin", function () {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];
    const commissionReceiver = accounts[4];
    const discountSensitivity = 0;

    // vars
    var refugeeCoin;

    beforeEach("deploying", async() => {
        const RefugeeCoinF = await ethers.getContractFactory("RefugeeCoin");
        
        const CommunityCoinFactoryF         = await ethers.getContractFactory("CommunityCoinFactory");
        const CommunityStakingPoolF         = await ethers.getContractFactory("MockCommunityStakingPool");
        const CommunityStakingPoolErc20F    = await ethers.getContractFactory("MockCommunityStakingPoolErc20");
        const CommunityStakingPoolFactoryF  = await ethers.getContractFactory("MockCommunityStakingPoolFactory");
        const CommunityRolesManagementF     = await ethers.getContractFactory("MockCommunityRolesManagement");

        const implementationRefugeeCoin                 = await RefugeeCoinF.deploy();
        const implementationCommunityStakingPoolFactory = await CommunityStakingPoolFactoryF.deploy();
        const implementationCommunityStakingPool        = await CommunityStakingPoolF.deploy();
        const implementationCommunityStakingPoolErc20   = await CommunityStakingPoolErc20F.deploy();
        const implementationCommunityRolesManagement    = await CommunityRolesManagementF.deploy();
        
        const NONE_COMMUNITY_SETTINGS = [ZERO_ADDRESS, ADMIN_ROLE, REDEEM_ROLE, CIRCULATE_ROLE];

        const CommunityCoinFactory  = await CommunityCoinFactoryF.deploy(
            implementationRefugeeCoin.address, 
            implementationCommunityStakingPoolFactory.address, 
            implementationCommunityStakingPool.address, 
            implementationCommunityStakingPoolErc20.address,
            implementationCommunityRolesManagement.address
        );

        let tx,rc,event,instance,instancesCount;
        // without hook
        tx = await CommunityCoinFactory.connect(owner).produce(ZERO_ADDRESS, discountSensitivity, NONE_COMMUNITY_SETTINGS);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        refugeeCoin = await ethers.getContractAt("RefugeeCoin",instance);
    });

    it("should correct token name ", async() => {
        const tokenName = "RefugeeCoin";
        expect(await refugeeCoin.name()).to.be.equal(tokenName);
    });

    it("should correct token symbol", async() => {
        const tokenSymbol = "RCoin";
        expect(await refugeeCoin.symbol()).to.be.equal(tokenSymbol);
    });

    it("should grant redeem role to user after 5 transfers", async() => {


        // getting rolesManagement Address
        let rolesManagement = await refugeeCoin.rolesManagement();
        let rolesManagementInstance = await ethers.getContractAt("MockCommunityRolesManagement",rolesManagement);
        
        expect(
           await rolesManagementInstance.hasRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address)
        ).to.be.equal(false);

        await refugeeCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(CIRCULATE_ROLE), alice.address);
        await refugeeCoin.connect(alice).addToCirculation(TEN);

        // still no redeem role granted to Alice
        expect(
           await rolesManagementInstance.hasRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address)
        ).to.be.equal(false);

        // make five transfer   .. ES2015
        // [...Array(5)].forEach(async (_, i) => {
        //     await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        // });

        await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        await refugeeCoin.connect(alice).transfer(bob.address, ONE);
        
        // now alice have redeem role 
        expect(
           await rolesManagementInstance.hasRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address)
        ).to.be.equal(true);
        
    });

//   it("should mint token by owner", async() => {
//     const amountToMint = ONE.mul(TEN.pow(BigNumber.from('18')));

//     let balanceBefore = await impactCoin.balanceOf(alice.address);

//     await impactCoin.connect(owner).mint(alice.address, amountToMint);

//     let balanceAfter = await impactCoin.balanceOf(alice.address);

//     expect(balanceAfter.sub(balanceBefore)).to.be.eq(amountToMint);

//   });
//   it("no one should mint the token other than the owner", async() => {
//     const amountToMint = ONE.mul(TEN.pow(BigNumber.from('18')));
    
//     await expect(
//       impactCoin.connect(alice).mint(alice.address, amountToMint)
//     ).to.be.revertedWith(
//       'AccessControl: account '+alice.address.toLowerCase()+' is missing role '+ethers.utils.keccak256(ethers.utils.toUtf8Bytes("REWARD_ROLE"))
//       );
//   });


//       it("should correct Bulk Sale", async() => {

//         const seriesId = BigNumber.from('1000');
        
//         const tokenId1 = ONE;
//         const tokenId2 = TEN;
//         const tokenId3 = HUN;
//         const id1 = seriesId.mul(TWO.pow(BigNumber.from('192'))).add(tokenId1);
//         const id2 = seriesId.mul(TWO.pow(BigNumber.from('192'))).add(tokenId2);
//         const id3 = seriesId.mul(TWO.pow(BigNumber.from('192'))).add(tokenId3);
    
//         const ids = [id1, id2, id3];
//         const users = [
//           alice.address,
//           bob.address,
//           charlie.address
//         ];

//         // try to distribte without setForwarder before
//         await expect(
//             this.nftBulkSale.connect(charlie).distribute(this.nft.address, ids, users, {value: price.mul(THREE)})
//         ).to.be.revertedWith("you can't manage this series");

//         expect(await this.nft.balanceOf(alice.address)).to.be.equal(ZERO);
//         expect(await this.nft.balanceOf(bob.address)).to.be.equal(ZERO);
//         expect(await this.nft.balanceOf(charlie.address)).to.be.equal(ZERO);


//         await this.nft.connect(owner).setTrustedForwarder(this.nftBulkSale.address);
//         await this.nftBulkSale.connect(charlie).distribute(this.nft.address, ids, users, {value: price.mul(THREE)});  

//         //await this.nft.connect(owner).mintAndDistribute(ids, users);

//         expect(await this.nft.balanceOf(alice.address)).to.be.equal(ONE);
//         expect(await this.nft.balanceOf(bob.address)).to.be.equal(ONE);
//         expect(await this.nft.balanceOf(charlie.address)).to.be.equal(ONE);

//         expect(await this.nft.ownerOf(id1)).to.be.equal(alice.address);
//         expect(await this.nft.ownerOf(id2)).to.be.equal(bob.address);
//         expect(await this.nft.ownerOf(id3)).to.be.equal(charlie.address);


// /*
//         const balanceBeforeBob = await ethers.provider.getBalance(bob.address);
//         const balanceBeforeAlice = await ethers.provider.getBalance(alice.address);
//         await this.nft.connect(bob)["buy(uint256,uint256,bool,uint256)"](id, price, false, ZERO, {value: price.mul(TWO)}); // accidentially send more than needed
//         const balanceAfterBob = await ethers.provider.getBalance(bob.address);
//         const balanceAfterAlice = await ethers.provider.getBalance(alice.address);
//         expect(balanceBeforeBob.sub(balanceAfterBob)).to.be.gt(price);
//         expect(balanceAfterAlice.sub(balanceBeforeAlice)).to.be.equal(price);
//         const newOwner = await this.nft.ownerOf(id);
//         expect(newOwner).to.be.equal(bob.address);

//         const tokenInfoData = await this.nft.tokenInfo(id);
//         expect(tokenInfoData.tokenInfo.salesInfoToken.saleInfo.currency).to.be.equal(ZERO_ADDRESS);
//         expect(tokenInfoData.tokenInfo.salesInfoToken.saleInfo.price).to.be.equal(ZERO);
//         expect(tokenInfoData.tokenInfo.salesInfoToken.saleInfo.onSaleUntil).to.be.equal(ZERO);
//         expect(tokenInfoData.tokenInfo.salesInfoToken.ownerCommissionValue).to.be.equal(ZERO);
//         expect(tokenInfoData.tokenInfo.salesInfoToken.authorCommissionValue).to.be.equal(ZERO);

//         const seriesInfo = await this.nft.seriesInfo(seriesId);
//         expect(seriesInfo.author).to.be.equal(alice.address);
//         expect(seriesInfo.saleInfo.currency).to.be.equal(ZERO_ADDRESS);
//         expect(seriesInfo.saleInfo.price).to.be.equal(price);
//         expect(seriesInfo.saleInfo.onSaleUntil).to.be.equal(now + 100000);
//         expect(seriesInfo.baseURI).to.be.equal(baseURI);
//         expect(seriesInfo.limit).to.be.equal(10000);

//         expect(await this.nft.mintedCountBySeries(seriesId)).to.be.equal(ONE);
// */
//       });

//     });
});