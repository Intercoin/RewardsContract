// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../../../submodules/NonFungibleTokenContract/contracts/presets/Factory.sol";

contract MockNFTFactory is Factory {
    constructor (
        address instance, 
        address costManager_
    ) Factory(instance, costManager_) {
        
    }
}