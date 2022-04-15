// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "./ImpactCoin.sol";
import "../submodules/NonFungibleTokenContract/contracts/presets/NFT.sol";
import "../submodules/CommunityContract/contracts/Community.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IReward.sol";

contract Reward is Initializable, ContextUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, IReward {

    bytes32 internal constant BONUS_CALLER = keccak256("BONUS_CALLER");
    
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


    struct ImpactCounter {
        CommunityRoles currentRole;
        uint256 amount;
    }
    mapping(address => ImpactCounter) impactCoinCounter;
// /*
// so make constructor and set params:
// address of ImpactCoin (see Impact Coin #3 )
// address of NFT (see NFT contract #4 )
// uint256 seriesId
// address of CommunityContract (see CommunityContract #6 )
// tuple of arrays(or two arrays) (string, uint256)[]
// like [("Role-100", 100),("Role-200", 200),("Role-500", 500),("Role-800", 800)]
// */

    function init(
        address impactCoinAddress,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        public
        virtual
        initializer
    {
        __Reward_init(impactCoinAddress, nftSettings, communitySettings);
    }

    function __Reward_init(
        address impactCoinAddress,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        internal
        onlyInitializing 
    {
        settings.nft.token = NFT(nftSettings.token);
        settings.nft.currency = nftSettings.currency;
        settings.nft.seriesId = nftSettings.seriesId;
        settings.nft.price = nftSettings.price;
        
        
        settings.impactCoin = ImpactCoin(impactCoinAddress);
        
        settings.community.addr = Community(communitySettings.addr);
        for(uint256 i = 0; i < communitySettings.roles.length; i++) {
            settings.community.roles.push(CommunityRoles(communitySettings.roles[i].rolename, communitySettings.roles[i].growcap));
        }

        __Ownable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(BONUS_CALLER, _msgSender());

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
        
        require(hasRole(BONUS_CALLER, _msgSender()), "DISABLED");

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
        /////////////////////
/*
        if (settings.nft.currency == address(0)) {
            try settings.nft.token.buyAuto(
                settings.nft.seriesId,  //uint64 seriesId, 
                settings.nft.currency,  //address currency, 
                settings.nft.price,     //uint256 price, 
                true,                   // bool safe, 
                0,                      //uint256 hookCount
                account                 // address buyFor
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
                0,                      //uint256 hookCount
                account                 // address buyFor
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

        //////////////////

        uint256 amountWas = impactCoinCounter[account].amount;
        uint256 amountCurrent = amountWas + amount;
        uint256 amountNearToCurrent = type(uint256).max;
        uint256 j;
        for(uint256 i = 0; i < settings.community.roles.length; i++) {
            if (
                amountCurrent <= settings.community.roles[i].growcap &&
                amountNearToCurrent >= settings.community.roles[i].growcap
            ) {
                amountNearToCurrent = settings.community.roles[i].growcap;
                j = i;
            }
        }

        if (type(uint256).max != amountNearToCurrent) {
            // so changed 
            // it can be next item,  or roles was changed and here is new item of new list
            
_changeCommunityRole(account, impactCoinCounter[account].currentRole.rolename, settings.community.roles[j].rolename);
            // // can be just renamed role and grap cap left the same
            // if (amountNearToCurrent == impactCoinCounter[account].currentRole.growcap) {
            //     if (!compareStrings(impactCoinCounter[account].currentRole.rolename, settings.community.roles[j].rolename)) {
                    
            //     // // change role from 
            //     // impactCoinCounter[account].currentRole.rolename
            //     // // to
            //     // settings.community.roles[j].rolename
            //     // // and update
            //     // impactCoinCounter[account].currentRole

            //     }
            // } else {

            // }


            impactCoinCounter[account].currentRole.rolename = settings.community.roles[j].rolename;
            impactCoinCounter[account].currentRole.growcap = settings.community.roles[j].growcap;

            

        }

*/        
    }

    function _changeCommunityRole(address account, string memory from, string memory to) internal {
        address[] memory members = new address[](1);
        members[0] = account;

        string[] memory roles = new string[](1);
        

        try (settings.community.addr).addMembers(
            members
        )
        {
            // if error is not thrown, we are fine
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while addMembers");
        }

        if ((!compareStrings(from,to))) {
            if (!compareStrings(from,"")) {
                roles[0] = from;
                try (settings.community.addr).revokeRoles(
                    members, roles
                )
                {
                    // if error is not thrown, we are fine
                } catch Error(string memory reason) {
                    // This is executed in case revert() was called with a reason
                    revert(reason);
                } catch {
                    revert("Errors while revokeRoles");
                }
            }

            
            roles[0] = to;
            try (settings.community.addr).grantRoles(
                members, roles
            )
            {
                // if error is not thrown, we are fine
            } catch Error(string memory reason) {
                // This is executed in case revert() was called with a reason
                revert(reason);
            } catch {
                revert("Errors while grantRoles");
            }

        }

        
        
    }


    function compareStrings(string memory a, string memory b) internal view returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}

