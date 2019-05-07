pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Capped.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";

contract OMIToken is ERC20Detailed, ERC20Burnable, ERC20Capped, ERC20Pausable {
  using SafeERC20 for ERC20;

  constructor ()
    ERC20Detailed("OMI Token", "OMI", 18)
    ERC20Capped(750000000000*1e18)
    ERC20Burnable()
    ERC20Pausable()
    ERC20()
    public
  {}

  /// @dev Function to call from other contracts to ensure that this is the proper contract
  function isOMITokenContract()
    public
    pure
    returns(bool)
  {
    return true;
  }
}