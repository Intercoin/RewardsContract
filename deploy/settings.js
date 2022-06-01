const { ethers } = require("hardhat");

// if contract.address != address(0)
//   use them
// else if contract.force == true
//   deploy contract and init with params
// else
//   if factory.address == address(0)
//     deploy new factory
//   use factory.produce new [contract]instance with [contract]init with params

module.exports = {
    rebuildImplementation: false, // implementation will be rebuild every deploy
    communitycontract:{
        factory:{
            address:false,
            init:[
                1,
                2,
            ]

        },
        //single:false,
        contract:{
            address:false,
            init:[
                1,
                2,

            ]
        },
        implemenation:true

    },
    
    communitycontract:{},
    name: "FantomTest Mock Token",
    symbol: "FMT",
    price: ethers.utils.parseEther("1000000")
};
