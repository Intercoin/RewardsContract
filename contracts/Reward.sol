// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "./ImpactCoin.sol";
import "../submodules/NonFungibleTokenContract/contracts/presets/NFT.sol";
import "../submodules/CommunityContract/contracts/Community.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./interfaces/IReward.sol";

//import "hardhat/console.sol";

contract Reward is Initializable, ContextUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, IReward {

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
 
    EnumerableSetUpgradeable.AddressSet internal tokensWhitelist;

    bytes32 internal constant BONUS_CALLER = keccak256("BONUS_CALLER");
    uint64 constant FRACTION = 100000;
    
    struct CommunityRoles {
        string rolename;
        uint256 growcap;
    }
    struct CommunitySettings {
        CommunityRoles[] roles;
        Community addr;
    }

    struct Multipliers {
        uint64 timestamp;
        uint64 multiplier;
    }
    struct ImpactSettings {
        address token;
        Multipliers[] multipliers;
    }

    struct NFTSettings {
        address token;
        address currency;
        uint64 seriesId;
        uint256 price;
    }

    struct Settings {
        ImpactSettings impactSettings;
        CommunitySettings community;
        NFTSettings nft;
    }

    Settings internal settings;

    struct ImpactCounter {
        CommunityRoles currentRole;
        uint256 amount;
    }
    mapping(address => ImpactCounter) impactCoinCounter;
    
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
        address instance, 
        address account, 
        uint64 duration, 
        uint256 amount

    ) 
        external 
        returns(uint256 extraTokenAmount) 
    {

        require(hasRole(BONUS_CALLER, _msgSender()), "DISABLED");

        proceedImpact(account, amount);
        proceedNft(account, amount);
        proceedCommunity(account, amount);
        
    }

    function transferHook(
        address operator, 
        address from, 
        address to, 
        uint256 amount
    ) 
        external 
        returns(bool)
    {
        return true;
    }

    function viewSettings() public view returns(Settings memory) {
        return settings;
    }
    
    function updateNftSettings(
        address currency,
        uint64 seriesId,
        uint256 price
    ) 
        public 
        onlyOwner 
    {
        settings.nft.currency = currency;
        settings.nft.seriesId = seriesId;
        settings.nft.price = price;
    }

    function updateCommunitySettings(
        CommunityRoles[] memory roles
    ) 
        public 
        onlyOwner 
    {
        delete settings.community.roles;
        for(uint256 i = 0; i < roles.length; i++) {
            settings.community.roles.push(CommunityRoles(roles[i].rolename, roles[i].growcap));
        }
    }

    function init(
        ImpactSettings memory impactSettings,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        public
        virtual
        initializer
    {
        __Reward_init(impactSettings, nftSettings, communitySettings);
    }

    function whitelistAdd(
        address token
    ) 
        public
        onlyOwner 
    {
        tokensWhitelist.add(token);
    }

    function whitelistRemove(
        address token
    ) 
        public
        onlyOwner 
    {
        tokensWhitelist.remove(token);
    }

    function whitelistExists(
        address token
    ) 
        public
        view 
        returns(bool)
    {
        return tokensWhitelist.contains(token);
    }

    function donate(
        address token, 
        uint256 amount
    ) 
        public
        payable 
    {
        require(tokensWhitelist.contains(token), "not in whitelist");
        if (token == address(0)) {
            require(msg.value >= amount, "insufficient funds");
            uint256 refund = msg.value - amount;
            if (refund > 0) {
                (bool transferSuccess, ) = msg.sender.call{gas: 3000, value: (refund)}(new bytes(0));
                require(transferSuccess, "REFUND_FAILED");
            }
            //refund

        } else {
            IERC20(token).transferFrom(_msgSender(), address(this), amount);
        }
    }
    

    function __Reward_init(
        ImpactSettings memory impactSettings,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        internal
        onlyInitializing 
    {
        settings.nft.token = nftSettings.token;
        settings.nft.currency = nftSettings.currency;
        settings.nft.seriesId = nftSettings.seriesId;
        settings.nft.price = nftSettings.price;
        
        settings.impactSettings.token = impactSettings.token;
        //settings.impactSettings.multipliers = impactSettings.multipliers;
        for(uint256 i = 0; i < impactSettings.multipliers.length; i++) {
            settings.impactSettings.multipliers.push(Multipliers(impactSettings.multipliers[i].timestamp, impactSettings.multipliers[i].multiplier));
        }

        settings.community.addr = Community(communitySettings.addr);
        for(uint256 i = 0; i < communitySettings.roles.length; i++) {
            settings.community.roles.push(CommunityRoles(communitySettings.roles[i].rolename, communitySettings.roles[i].growcap));
        }

        __Ownable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(BONUS_CALLER, _msgSender());

    }

    function proceedImpact(
        address account, 
        uint256 amount
    ) 
        internal 
    {   
        
        amount = calculateImpactAmount(amount);

        address[2] memory sendto = [account, address(0)];
        uint256[2] memory amountto = [amount, 0];

        // 10% minted to user who invite 
        try (settings.community.addr).invitedBy(
            account
        )
            returns(address addr)
        {
            if (addr != address(0)) {
                sendto[1] = addr;
                amountto[1] = amount / 10;
                amountto[0] -= amountto[1];
            }
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while invitedBy");
        }


        for (uint256 i = 0; i < sendto.length; i++) {
            if (sendto[i] != address(0)) {
                    
                try ImpactCoin(settings.impactSettings.token).mint(
                    sendto[i], amountto[i]
                )
                {
                    // if error is not thrown, we are fine
                } catch Error(string memory reason) {
                    // This is executed in case revert() was called with a reason
                    revert(reason);
                } catch {
                    revert("Errors while minting ICoin");
                }
        
            }
        }
    }

    function calculateImpactAmount(
        uint256 amount
    ) 
        internal 
        view 
        returns(uint256)
    {
        uint256 len = settings.impactSettings.multipliers.length;
        if (len > 0) {

            // find max timestamp from all that less then now.
            // there will not a lot multipliers so we can use loop here
            uint256 multiplier = FRACTION;
            uint256 tmpTimestamp = 0;
            for (uint256 i = 0; i < len; i++) {

                if (
                    (tmpTimestamp <= settings.impactSettings.multipliers[i].timestamp) && 
                    (block.timestamp >= settings.impactSettings.multipliers[i].timestamp)
                ) {

                    tmpTimestamp = settings.impactSettings.multipliers[i].timestamp;
                    multiplier = settings.impactSettings.multipliers[i].multiplier;
                }
            }

            amount = amount * multiplier / FRACTION;
        }
        return amount;
    }

    function proceedNft(
        address account, 
        uint256 amount
    ) 
        internal 
    {
        // trying call with trusted forward
        bytes memory data = abi.encodeWithSelector(
            NFTMain.mintAndDistributeAuto.selector,
            settings.nft.seriesId,
            account, 
            1
        );
        // using a meta transaction.  expect that rewardContract is a trusted forwarder for NFT so it can call any method as owner
        // get owner address
        address nftContractOwner = NFT(settings.nft.token).owner();
        data = abi.encodePacked(data,nftContractOwner);    

        (bool success, bytes memory result) = address(settings.nft.token).call(data);
        if (!success) {
            // Next 5 lines from https://ethereum.stackexchange.com/a/83577
            if (result.length < 68) revert("Errors while minting NFT"); //silently
            assembly {
                result := add(result, 0x04)
            }
            revert(abi.decode(result, (string)));
        }
    }

    function proceedCommunity(
        address account, 
        uint256 amount
    ) 
        internal 
    {
        uint256 amountWas = impactCoinCounter[account].amount;
        uint256 amountCurrent = amountWas + amount;
        
        uint256 amountNearToCurrent = type(uint256).max;
        uint256 j;

        uint256 indexMax = 0;
        for(uint256 i = 0; i < settings.community.roles.length; i++) {
            if (
                amountCurrent <= settings.community.roles[i].growcap &&
                amountNearToCurrent >= settings.community.roles[i].growcap
            ) {
                amountNearToCurrent = settings.community.roles[i].growcap;
                j = i;
            }

            if (settings.community.roles[indexMax].growcap <= settings.community.roles[i].growcap) {
                indexMax = i;
            }

        }

        // if role changed by grow up usercap  OR roles can be changed by owner and any donation should recalculated(custom case when cap the same but role are different)
        bool needToUpdate = false;
        uint256 indexToUpdate = 0;

        if (type(uint256).max != amountNearToCurrent) {
            indexToUpdate = j;
            needToUpdate = true;
        } else if (compareStrings(impactCoinCounter[account].currentRole.rolename, settings.community.roles[indexMax].rolename) == false) {
            indexToUpdate = indexMax;
            needToUpdate = true;
        }

        if (needToUpdate) {
            _changeCommunityRole(account, impactCoinCounter[account].currentRole.rolename, settings.community.roles[indexToUpdate].rolename);
            
            impactCoinCounter[account].currentRole.rolename = settings.community.roles[indexToUpdate].rolename;
            impactCoinCounter[account].currentRole.growcap = settings.community.roles[indexToUpdate].growcap;
            impactCoinCounter[account].amount = amountCurrent;
        }
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

