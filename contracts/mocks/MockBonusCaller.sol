// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../interfaces/IReward.sol";
//import "hardhat/console.sol";

contract MockBonusCaller {

    address public tradedToken;
    uint64 public duration;

    function setVars(
        address tradedToken_,
        uint64 duration_
    )
        public
    {
        tradedToken = tradedToken_;
        duration = duration_;
    }

    function bonusCall(
        address caller, 
        address account, 
        uint256 amount
    ) 
        public 
    {

        try IReward(caller).bonus(
            address(this), account, duration, amount//, 
        )
        {
            // if error is not thrown, we are fine
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while calling bonus method");
        }
    }
}