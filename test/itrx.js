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
const SIX = BigNumber.from('6');
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const TENIN18 = TEN.pow(BigNumber.from('18'));

const FRACTION = BigNumber.from('100000');

chai.use(require('chai-bignumber')());

describe("itrx", function () {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];
    const commissionReceiver = accounts[4];
    const liquidityHolder = accounts[5];
    

    const tokenName = "Intercoin x";
    const tokenSymbol = "ITRx";
    const defaultOperators = [];
    const initialSupply = TEN.mul(TEN.pow(SIX)).mul(TENIN18); // 10kk * 10^18
    const maxTotalSupply = TEN.mul(TEN.pow(NINE)).mul(TENIN18); // 10kkk * 10^18

    // vars
    var itrx;
    var itrxFactory;
    beforeEach("deploying", async() => {
        itrxFactory = await ethers.getContractFactory("ITRx");
        itrx = await itrxFactory.connect(owner).deploy(
            tokenName,
            tokenSymbol,
            defaultOperators,
            initialSupply,
            maxTotalSupply
        );
    });

    it("should correct token name ", async() => {
        expect(await itrx.name()).to.be.equal(tokenName);
    });

    it("should correct token symbol", async() => {
        expect(await itrx.symbol()).to.be.equal(tokenSymbol);
    });

    it("should correct token initialSupply", async() => {
        expect(await itrx.totalSupply()).to.be.equal(initialSupply);
    });

    it("should correct token maxTotalSupply", async() => {
        expect(await itrx.maxTotalSupply()).to.be.equal(maxTotalSupply);
    });

    it("should mint token person from whitelist only", async() => {
        const amountToMint = ONE.mul(TEN.pow(BigNumber.from('18')));
        let balanceBefore = await itrx.balanceOf(alice.address);
        await itrx.connect(owner).mint(alice.address, amountToMint);
        let balanceAfter = await itrx.balanceOf(alice.address);
        expect(balanceAfter.sub(balanceBefore)).to.be.eq(amountToMint);
    });

    it("no one should mint the token except persons from whitelist", async() => {
        const amountToMint = ONE.mul(TEN.pow(BigNumber.from('18')));
        await expect(
            itrx.connect(alice).mint(alice.address, amountToMint)
        ).to.be.revertedWith("must be in whitelist");
    });

    describe("uniswap tests", function () {
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPool;
        var pairInstance;

        const UNISWAP_ROUTER_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
        const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
        const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // main
        
        beforeEach("deploying", async() => {
            uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
            uniswapRouterInstance = await ethers.getContractAt("IUniswapRouter", UNISWAP_ROUTER);

            await uniswapRouterFactoryInstance.createPair(itrx.address, WETH);

            let pairAddress = await uniswapRouterFactoryInstance.getPair(itrx.address, WETH);
            pairInstance = await ethers.getContractAt("ERC20",pairAddress);

            await itrx.connect(owner).mint(owner.address, TEN.mul(TENIN18));
            await itrx.connect(owner).approve(uniswapRouterInstance.address, TEN.mul(TENIN18));

            const ts = await time.latest();
            const timeUntil = parseInt(ts)+parseInt('1000000000');

            await uniswapRouterInstance.connect(owner).addLiquidityETH(
                itrx.address,
                TEN.mul(TENIN18),
                0,
                0,
                owner.address,
                timeUntil
                ,{value: TEN.mul(TENIN18)}
            );
        });
        
        it("shouldnt exchange at uniswap", async() => {
            // here uniswap revert while transfer from pair to Bob but fall with own MSG "UniswapV2: TRANSFER_FAILED"
            await expect(
                 uniswapRouterInstance.connect(bob).swapExactETHForTokens(
                    0,                          //uint amountOutMin, 
                    [WETH,itrx.address],        //address[] calldata path, 
                    bob.address,                //address to, 
                    Math.floor(Date.now()/1000) //uint deadline
                    ,{value: ONE.mul(TENIN18)}
                )
            ).to.be.revertedWith("UniswapV2: TRANSFER_FAILED");

            const amountToTransfer = ONE.mul(TENIN18);
            await itrx.connect(owner).transfer(bob.address, amountToTransfer);
            await itrx.connect(bob).approve(uniswapRouterInstance.address, amountToTransfer);

            await expect(
                 uniswapRouterInstance.connect(bob).swapExactTokensForETH(
                    (ONE).mul(TENIN18).div(TEN),//amountToTransfer,           // uint amountIn, 
                    0,                          //uint amountOutMin, 
                    [itrx.address,WETH],        //address[] calldata path, 
                    bob.address,                //address to, 
                    Math.floor(Date.now()/1000) //uint deadline
                )
            ).to.be.revertedWith("TransferHelper: TRANSFER_FROM_FAILED");
            // different message because uniswap try to 

        });

        it("should transfer [whitelist -> user] ", async() => {
            const balanceBefore = await itrx.balanceOf(bob.address);
            const amountToTransfer = ONE.mul(TENIN18);
            await itrx.connect(owner).transfer(bob.address, amountToTransfer);
            const balanceAfter = await itrx.balanceOf(bob.address);
            expect(balanceAfter.sub(balanceBefore)).to.be.eq(amountToTransfer);
        });

        it("shouldnt transfer user -> user ", async() => {
            const amountToTransfer = ONE.mul(TENIN18);
            await itrx.connect(owner).transfer(bob.address, amountToTransfer);

            await expect(
                itrx.connect(bob).transfer(alice.address, amountToTransfer)
            ).to.be.revertedWith("TRANSFER_DISABLED");
        });
        
        it("should transferFrom [whitelist -> user]", async() => {
            const amountToTransfer = ONE.mul(TENIN18);

            const balanceOwnerBefore = await itrx.balanceOf(owner.address);
            const balanceBobBefore = await itrx.balanceOf(bob.address);
            const balanceAliceBefore = await itrx.balanceOf(alice.address);

            await itrx.connect(owner).approve(bob.address, amountToTransfer);
            await itrx.connect(bob).transferFrom(owner.address, alice.address, amountToTransfer);

            const balanceOwnerAfter = await itrx.balanceOf(owner.address);
            const balanceBobAfter = await itrx.balanceOf(bob.address);
            const balanceAliceAfter = await itrx.balanceOf(alice.address);

            expect(balanceAliceAfter.sub(balanceAliceBefore)).to.be.eq(amountToTransfer);
            expect(balanceOwnerBefore.sub(balanceOwnerAfter)).to.be.eq(amountToTransfer);
            expect(balanceBobBefore).to.be.eq(balanceBobAfter);
        });

        it("shouldnt transferFrom user -> user ", async() => {
            const amountToTransfer = ONE.mul(TENIN18);
            await itrx.connect(owner).transfer(bob.address, amountToTransfer);

            await itrx.connect(bob).approve(alice.address, amountToTransfer);

            await expect(
                itrx.connect(alice).transferFrom(bob.address, charlie.address, amountToTransfer)
            ).to.be.revertedWith("TRANSFER_DISABLED");
        });

        it("should remove liquidity by person from whitelist", async() => {
            const lpTokensAmount = await pairInstance.balanceOf(owner.address);
            await pairInstance.connect(owner).approve(uniswapRouterInstance.address, lpTokensAmount);       
            await uniswapRouterInstance.connect(owner).removeLiquidity(
                itrx.address,                   // address tokenA,
                WETH,                           // address tokenB,
                lpTokensAmount.div(TWO),        // uint liquidity,
                0,                              // uint amountAMin,
                0,                              // uint amountBMin,
                owner.address,                  // address to,
                Math.floor(Date.now()/1000)+5000// uint deadline
            );

        });

        it("shouldnt remove liquidity by person outside whitelist", async() => {
            const lpTokensAmount = await pairInstance.balanceOf(owner.address);
            await pairInstance.connect(owner).transfer(bob.address, lpTokensAmount);
            await pairInstance.connect(bob).approve(uniswapRouterInstance.address, lpTokensAmount);       

            await expect(
                uniswapRouterInstance.connect(bob).removeLiquidity(
                    itrx.address,                   // address tokenA,
                    WETH,                           // address tokenB,
                    lpTokensAmount.div(TWO),        // uint liquidity,
                    0,                              // uint amountAMin,
                    0,                              // uint amountBMin,
                    bob.address,                    // address to,
                    Math.floor(Date.now()/1000)+5000// uint deadline
                )
            ).to.be.revertedWith("UniswapV2: TRANSFER_FAILED");


        });
    });
    

});