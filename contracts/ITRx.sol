// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
//import "hardhat/console.sol";

contract ITRx is ERC777, AccessControlEnumerable {
    uint256 public immutable maxTotalSupply;
    bytes32 internal constant WHITELIST = keccak256("WHITELIST");
    
    /**
     * @dev Mints `initialSupply` amount of token and transfers them to `owner`.
     *
     * See {ERC777-constructor}.
     */
    constructor(
        string memory name,
        string memory symbol,
        address[] memory defaultOperators,
        uint256 initialSupply,
        uint256 cap
    ) ERC777(name, symbol, defaultOperators) {

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(WHITELIST, _msgSender());

        require(cap > 0 && initialSupply <= cap , "cap is invalid");
        maxTotalSupply = cap;
        _mint(_msgSender(), initialSupply, "", "");
    }

    /**
     * @dev mint available only by owner
     */
    function mint(address account, uint256 amount) public {
        require(hasRole(WHITELIST, _msgSender()), "must be in whitelist");
        _mint(account, amount, "", "");
    }

    /**
     * @dev See {ERC777-_mint}.
     */
    function _mint(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) 
        internal 
        virtual 
        override 
    {
        require(ERC777.totalSupply() + amount <= maxTotalSupply, "cap exceeded");
        super._mint(account, amount, userData, operatorData, true);
    }

     /**
     * @dev Hook that is called before any token transfer. This includes
     * calls to {send}, {transfer}, {operatorSend}, minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address /*operator*/,
        address from,
        address to,
        uint256 /*amount*/
    ) 
        internal 
        virtual 
        override 
    {
        require(
            (
                hasRole(WHITELIST, _msgSender()) ||
                hasRole(WHITELIST, from) || 
                hasRole(WHITELIST, to)
            ), 
            "TRANSFER_DISABLED"
        );
    }

}

