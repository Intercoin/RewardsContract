// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../interfaces/IReward.sol";

contract MockBonusCaller {
    function bonusCall(address caller, address account, uint256 amount) public {
        
        try IReward(caller).bonus(
            account, amount
        )
        returns(uint256)
        {
            // if error is not thrown, we are fine
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while callin bonus method");
        }
    }
}