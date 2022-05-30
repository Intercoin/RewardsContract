// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "./interfaces/IControlContract.sol";
import "./Reward.sol";

contract RewardFactory {
    using Clones for address;

    /**
    * @custom:shortd RewardContract implementation address
    * @notice RewardContract implementation address
    */
    Reward public immutable rewardContractImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    */
    constructor(
    ) 
    {
        rewardContractImplementation = new Reward();
    }

    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount()
        external 
        view 
        returns (uint256 amount) 
    {
        amount = instances.length;
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     *
     */
    function produce(
        Reward.ImpactSettings memory impactSettings,
        Reward.NFTSettings memory nftSettings,
        Reward.CommunitySettings memory communitySettings
    ) 
        public 
        returns (address instance) 
    {
        instance = address(rewardContractImplementation).clone();
        _produce(instance);
        
        Reward(payable(instance)).init(impactSettings, nftSettings, communitySettings);
        Ownable(instance).transferOwnership(msg.sender);
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    function _produce(
        address instance
    ) 
        internal
    {
        require(instance != address(0), "Factory: INSTANCE_CREATION_FAILED");

        instances.push(instance);
        
        emit InstanceCreated(instance, instances.length);
    }

}