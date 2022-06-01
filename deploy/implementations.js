'use strict';
const fs = require('fs');
//const HDWalletProvider = require('truffle-hdwallet-provider');

function get_data(_message) {
    return new Promise(function(resolve, reject) {
        fs.readFile('./deploy/installation_data.json', (err, data) => {
            if (err) {
                if (err.code == 'ENOENT' && err.syscall == 'open' && err.errno == -4058) {
                    fs.writeFile('./deploy/installation_data.json', "", (err) => {
                        if (err) throw err;
                        resolve();
                    });
                    data = "{}"
                } else {
                    throw err;
                }
            }
    
            resolve(data);
        });
    });
}

function write_data(_message) {
    return new Promise(function(resolve, reject) {
        fs.writeFile('./deploy/installation_data.json', _message, (err) => {
            if (err) throw err;
            console.log('Data written to file');
            resolve();
        });
    });
}

module.exports = async(rebuildImplementation) => {
    var data = await get_data();
    var data_object_root = JSON.parse(data);
    var data_object = {};
    if (typeof data_object_root[hre.network.name] === 'undefined') {
        data_object.time_created = Date.now()
    } else {
        data_object = data_object_root[hre.network.name];
    }
    /////////////////////////////////////////////////////////////
    let tmp;
    const [,deployer] = await ethers.getSigners();

    var options = {
		//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
		gasLimit: 10e6
	};
    const CommunityF = await ethers.getContractFactory("Community");
    const CommunityERC721F = await ethers.getContractFactory("CommunityERC721");
    const NFTF = await ethers.getContractFactory("NFT");
    const ImpactCoinF = await ethers.getContractFactory("ImpactCoin");

    // if (useImplementationCache) {
    //     if (typeof data_object.community === 'undefined') {
    //         tmp = await CommunityF.connect(deployer).deploy();
    //         data_object.community = tmp.address;
    //     }
    // } else {
    //     tmp = await CommunityF.connect(deployer).deploy();
    //     data_object.community = tmp.address;
    // }

    //community
    data_object.community = 
        (rebuildImplementation) || (typeof data_object.community === 'undefined')
        ?
        (await CommunityF.connect(deployer).deploy()).address
        :
        data_object.community
        ;
    data_object.communityerc721 = 
        (rebuildImplementation) || (typeof data_object.communityerc721 === 'undefined')
        ?
        (await CommunityERC721F.connect(deployer).deploy()).address
        :
        data_object.communityerc721
        ;

    //nft
    data_object.nft = 
        (rebuildImplementation) || (typeof data_object.nft === 'undefined')
        ?
        (await NFTF.connect(deployer).deploy(options)).address
        :
        data_object.nft
        ;

    //impactCoin
    data_object.impact = 
        (rebuildImplementation) || (typeof data_object.impact === 'undefined')
        ?
        (await ImpactCoinF.connect(deployer).deploy()).address
        :
        data_object.impact
        ;



        //     address communityImpl,
        // address communityerc721Impl
    


    /////////////////////////////////////////////////////////////
    // const { getChainId } = hre;
    // console.log("networkName=",hre.network.name);
    // console.log("chainId=",hre.network.config.chainId);
    const ts_updated = Date.now();
    data_object.time_updated = ts_updated;
    data_object_root[`${hre.network.name}`] = data_object;
    data_object_root.time_updated = ts_updated;
    let data_to_write = JSON.stringify(data_object_root, null, 2);
    await write_data(data_to_write);

    return data_object;
}