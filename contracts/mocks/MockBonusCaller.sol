// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../interfaces/IReward.sol";
//import "hardhat/console.sol";

contract MockBonusCaller {
    function bonusCall(address caller, address account, uint256 amount) public {
//console.log("bonusCall");
//console.log("MockBonusCaller::address(this)", msg.sender);
//console.log("MockBonusCaller::caller", caller);
//console.log("msg.value=",msg.value);
//console.log("gasleft()=",gasleft());
        try IReward(caller).bonus(
            address(0), account, 0, amount//, 
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