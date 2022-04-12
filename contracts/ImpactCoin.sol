// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ImpactCoin is ERC20, Ownable {

    constructor(
    ) 
        ERC20("ImpactCoin", "ICoin") 
    {

    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must be owner.
     */
    function mint(
        address to, 
        uint256 amount
    ) 
        public 
        virtual 
        onlyOwner 
    {
        _mint(to, amount);
    }

}

