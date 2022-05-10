// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20Mintable is ERC20 {
    

    constructor(
    ) 
        ERC20("ERC20", "ERC20") 
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
        _mint(to, amount);
    }

}

