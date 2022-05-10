// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract MockERC777Mintable is ERC777 {
    

    constructor(
    ) 
        ERC777("ERC777", "ERC777", new address[](0)) 
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
    {
        _mint(to, amount, "", "");
    }

}

