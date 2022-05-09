async function main() {
    const hre = require("hardhat");
    const { waffle } = require('hardhat');
    const { BigNumber } = require('ethers');
    const { constants, balance } = require('@openzeppelin/test-helpers');
    const { ZERO_ADDRESS } = constants;
    
    const deploy_settings = require('../deploy/settings.js');
    const deploy_implementations = require('../deploy/implementations.js');

	const [,deployer] = await ethers.getSigners();



	console.log("Deploying contracts with the account:",deployer.address);
    console.log("Account balance:", (await balance.current(deployer.address)).toString());
    
    console.log("Deploying implementation");
    //if deploy_settings.rebuildImplementation

    console.log(deploy_settings);

    const implementations = await deploy_implementations(deploy_settings.rebuildImplementation);
    console.log(implementations);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });