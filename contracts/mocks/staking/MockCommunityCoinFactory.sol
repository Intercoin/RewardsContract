// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../../../submodules/StakingContract/contracts/CommunityCoinFactory.sol";

contract MockCommunityCoinFactory is CommunityCoinFactory {

    /**
    * @param communityCoinImpl address of CommunityCoin implementation
    * @param communityStakingPoolFactoryImpl address of CommunityStakingPoolFactory implementation
    * @param stakingPoolImpl address of StakingPool implementation
    * @param stakingPoolImplErc20 address of StakingPoolErc20 implementation
    * @param rolesManagementImpl address of RolesManagement implementation
    */
    constructor(
        address communityCoinImpl,
        address communityStakingPoolFactoryImpl,
        address stakingPoolImpl,
        address stakingPoolImplErc20,
        address rolesManagementImpl
    ) 
        CommunityCoinFactory(communityCoinImpl, communityStakingPoolFactoryImpl, stakingPoolImpl, stakingPoolImplErc20, rolesManagementImpl) 
    {
        
    }
}