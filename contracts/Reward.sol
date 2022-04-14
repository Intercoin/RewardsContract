// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "./ImpactCoin.sol";
import "../submodules/NonFungibleTokenContract/contracts/presets/NFT.sol";
import "../submodules/CommunityContract/contracts/Community.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IReward.sol";

contract Reward is Initializable, ContextUpgradeable, OwnableUpgradeable, IReward {
    struct CommunityRoles {
        string rolename;
        uint256 growcap;
    }
    struct CommunitySettings {
        CommunityRoles[] roles;
        Community addr;
    }
    struct NFTSettings {
        NFT token;
        address currency;
        uint64 seriesId;
        uint256 price;
    }

    struct Settigns {
        ImpactCoin impactCoin;
        CommunitySettings community;
        NFTSettings nft;
    }

    
    

    Settigns settings;
    
// /*
// so make constructor and set params:
// address of ImpactCoin (see Impact Coin #3 )
// address of NFT (see NFT contract #4 )
// uint256 seriesId
// address of CommunityContract (see CommunityContract #6 )
// tuple of arrays(or two arrays) (string, uint256)[]
// like [("Role-100", 100),("Role-200", 200),("Role-500", 500),("Role-800", 800)]
// */

 function __Reward_init(
        address impactCoinAddress,
        NFTSettings memory nftSettings,
        address payable communityAddress,
        CommunityRoles[] memory communityRoles
    ) 
        public
        onlyInitializing 
    {
        settings.nft.token = NFT(nftSettings.token);
        settings.nft.currency = nftSettings.currency;
        settings.nft.seriesId = nftSettings.seriesId;
        settings.nft.price = nftSettings.price;
        
        
        settings.impactCoin = ImpactCoin(impactCoinAddress);
        
        settings.community.addr = Community(communityAddress);
        for(uint256 i = 0; i < communityRoles.length; i++) {
            settings.community.roles.push(CommunityRoles(communityRoles[i].rolename, communityRoles[i].growcap));
        }

        __Ownable_init();

    }

// mint amount of ImpactCoin to account
// mint NFT to account with series seriesId
// calculate total ImpactCoin granted to account and move account to the appropriate role. Remember that user's role would be the one at the moment from this set.
// method will return extraTokenAmount
// for example.
// in beginning user have 0.
// user obtain 150 ICoin, Total=150 ICoin - contract grant "Role-100",
// user obtain 200 ICoin, Total=350 ICoin - contract revoke "Role-100" and grant "Role-200",
// user obtain 700 ICoin, Total=1050 ICoin - contract revoke "Role-200" and grant "Role-800", (here we pass role "Role-500")

    function bonus(
        address account, 
        uint256 amount
    ) 
        external 
        returns(uint256 extraTokenAmount) 
    {
        try settings.impactCoin.mint(
            account, amount
        )
        {
            // if error is not thrown, we are fine
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while mintint ICoin");
        }

        if (settings.nft.currency == address(0)) {
            try settings.nft.token.buyAuto(
                settings.nft.seriesId,  //uint64 seriesId, 
                settings.nft.currency,  //address currency, 
                settings.nft.price,     //uint256 price, 
                true,                   // bool safe, 
                0                       //uint256 hookCount
            )
            {
                // if error is not thrown, we are fine
            } catch Error(string memory reason) {
                // This is executed in case revert() was called with a reason
                revert(reason);
            } catch {
                revert("Errors while mintint ICoin");
            }
        } else {
            
            try settings.nft.token.buyAuto(
                settings.nft.seriesId,  //uint64 seriesId, 
                settings.nft.price,     //uint256 price, 
                true,                   // bool safe, 
                0                       //uint256 hookCount
            )
            {
                // if error is not thrown, we are fine
            } catch Error(string memory reason) {
                // This is executed in case revert() was called with a reason
                revert(reason);
            } catch {
                revert("Errors while mintint ICoin");
            }
        
        }
    }
}

