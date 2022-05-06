// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../../submodules/CommunityContract/contracts/Community.sol";

contract MockCommunity is Community {

    function setInvitedByAddress(address invitedBy_, address invited_) public {
        invitedBy[invited_] = invitedBy_;
    }

}