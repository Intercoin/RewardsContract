// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

interface IReward {
    function bonus(address account, uint256 amount) external payable returns(uint256 extraTokenAmount);
}