// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../submodules/StakingContract/contracts/CommunityCoin.sol";

//import "hardhat/console.sol";

contract RefugeeCoin is CommunityCoin {

    mapping (address => uint256) transferCount;
    uint256 internal constant transferCap = 5;

    bytes32 internal redeemRoleExt;
    // initialize should stay unchanged, else need to rebase factory which initialized it
    function initialize(
        address impl,
        address implErc20,
        address hook_,
        address communityCoinInstanceAddr,
        uint256 discountSensitivity_,
        address rolesManagementAddr_
    ) 
        initializer 
        external 
        virtual
        override 
    {
        CommunityCoinBase__init("RefugeeCoin", "RCoin", impl, implErc20, hook_, communityCoinInstanceAddr, discountSensitivity_, rolesManagementAddr_);

        redeemRoleExt = rolesManagement.getRedeemRole();
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 amount
    ) 
        internal 
        virtual 
        override 
    {
        if (
           (from == address(0)) || // minted case
           (from == address(this)) // any cases then from it's  contract itself
        ) {

        } else {
        
            transferCount[from] += 1;

            if (transferCount[from] >= transferCap) {
                rolesManagement.grantRole(redeemRoleExt, from);
            }
                
        }

        super._beforeTokenTransfer(operator, from, to, amount);

    }
}