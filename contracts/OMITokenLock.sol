pragma solidity ^0.4.24;

import "./OMIToken.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/// @title OMITokenLock
/// @author Mikel Duffy - <mikel@ecomi.com>
/// @dev OMITokenLock is a token holder contract that will allow multiple beneficiaries to extract the tokens after a given release time. It is a modification of the OpenZeppenlin TokenLock to allow for one token lock smart contract for many beneficiaries.
contract OMITokenLock is Ownable, Pausable {
  using SafeMath for uint256;

  /*
   *  Storage
   */
  OMIToken public token;
  address public allowanceProvider;

  struct Lock {
    uint256 amount;
    uint256 startTime;
    uint256 lockDuration;
    bool released;
    bool revoked;
  }
  struct TokenLockVault {
    address beneficiary;
    uint256 tokenBalance;
    uint256 lockIndex;
    Lock[] locks;
  }
  mapping(address => TokenLockVault) public tokenLocks;
  address[] public lockIndexes;
  uint256 public totalTokensLocked;

  /*
   *  Events
   */
  event LockedTokens(address indexed beneficiary, uint256 amount, uint256 startTime, uint256 lockDuration);
  event UnlockedTokens(address indexed beneficiary, uint256 amount);

  /*
   *  Public Functions
   */
  /// @dev Constructor function
  function OMITokenLock (address _token, address _allowanceProvider) public {
    token = OMIToken(_token);
    require(token.isOMITokenContract());

    allowanceProvider = _allowanceProvider;
  }

  /// @dev Function to call from other contracts to ensure that this is the proper contract
  function isOMITokenLockContract()
    public 
    pure 
    returns(bool)
  { 
    return true; 
  }

  /// @dev Sets the token allowance provider address
  /// @param _allowanceProvider The address of the token allowance provider
  function setAllowanceAddress (address _allowanceProvider)
    public
    onlyOwner
    returns (bool)
  {
    allowanceProvider = _allowanceProvider;
    return true;
  }

  /// @dev Gets the total amount of tokens for a given address
  /// @param _beneficiary The address for which to look up the total token amount
  function getTokenBalance(address _beneficiary)
    public
    view
    returns (uint)
  {
    return tokenLocks[_beneficiary].tokenBalance;
  }

  /// @dev Gets the total number of locks for a given address
  /// @param _beneficiary The address for which to look up the total number of locks
  function getNumberOfLocks(address _beneficiary)
    public
    view
    returns (uint)
  {
    return tokenLocks[_beneficiary].locks.length;
  }

  /// @dev Gets the lock at a given index for a given address
  /// @param _beneficiary The address used to look up the lock
  /// @param _lockIndex The index used to look up the lock
  function getLockByIndex(address _beneficiary, uint256 _lockIndex)
    public
    view
    returns (uint256 amount, uint256 lockDuration, bool released, bool revoked)
  {
    require(_lockIndex >= 0);
    require(_lockIndex <= tokenLocks[_beneficiary].locks.length.sub(1));

    return (
      tokenLocks[_beneficiary].locks[_lockIndex].amount,
      tokenLocks[_beneficiary].locks[_lockIndex].lockDuration,
      tokenLocks[_beneficiary].locks[_lockIndex].released,
      tokenLocks[_beneficiary].locks[_lockIndex].revoked
    );
  }

  /// @dev Revokes the lock at a given index for a given address
  /// @param _beneficiary The address used to look up the lock
  /// @param _lockIndex The lock index to be revoked
  function revokeLockByIndex(address _beneficiary, uint256 _lockIndex)
    public
    onlyOwner
    returns (bool)
  {
    require(_lockIndex >= 0);
    require(_lockIndex <= tokenLocks[_beneficiary].locks.length.sub(1));
    require(!tokenLocks[_beneficiary].locks[_lockIndex].revoked);

    tokenLocks[_beneficiary].locks[_lockIndex].revoked = true;

    return true;
  }

  /// @dev Locks tokens for a given beneficiary
  /// @param _beneficiary The address to which the tokens will be released
  /// @param _lockDuration The duration of time that must elapse after the crowdsale end date
  /// @param _tokens The amount of tokens to be locked
  function lockTokens(address _beneficiary, uint256 _startTime, uint256 _lockDuration, uint256 _tokens)
    external
    onlyOwner
    whenNotPaused
  {
    // Lock duration must be greater than zero seconds
    require(_lockDuration >= 0);
    // Token amount must be greater than zero
    require(_tokens > 0);

    // Token Lock must have a sufficient allowance prior to creating locks
    require(_tokens.add(totalTokensLocked) <= token.allowance(allowanceProvider, address(this)));

    TokenLockVault storage lock = tokenLocks[_beneficiary];

    // If this is the first lock for this beneficiary, add their address to the lock indexes
    if (lock.beneficiary == 0) {
      lock.beneficiary = _beneficiary;
      lock.lockIndex = lockIndexes.length;
      lockIndexes.push(_beneficiary);
    }

    // Add the lock
    lock.locks.push(Lock(_tokens, _startTime, _lockDuration, false, false));

    // Update the total tokens for this beneficiary
    lock.tokenBalance = lock.tokenBalance.add(_tokens);

    // Update the number of locked tokens
    totalTokensLocked = _tokens.add(totalTokensLocked);

    LockedTokens(_beneficiary, _tokens, _startTime, _lockDuration);
  }

  /// @dev Transfers any tokens held in a timelock vault to beneficiary if they are due for release.
  function releaseTokens()
    public
    whenNotPaused
    returns(bool)
  {
    require(_release(msg.sender));
    return true;
  }

  /// @dev Transfers tokens held by timelock to all beneficiaries within the provided range.
  /// @param _beneficiary The user for which token locks should be released.
  function releaseTokensByAddress(address _beneficiary)
    external
    whenNotPaused
    onlyOwner
    returns (bool)
  {
    require(_release(_beneficiary));
    return true;
  }

  /*
   *  Internal Functions
   */
  /// @dev Reviews and releases token for a given beneficiary
  /// @param _beneficiary address for which a token release should be attempted
  function _release(address _beneficiary)
    internal
    whenNotPaused
    returns (bool)
  {
    TokenLockVault memory lock = tokenLocks[_beneficiary];
    require(lock.beneficiary == _beneficiary);
    require(_beneficiary != 0x0);

    bool hasUnDueLocks = false;

    for (uint256 i = 0; i < lock.locks.length; i++) {
      Lock memory currentLock = lock.locks[i];
      // Skip any locks which are already released or revoked
      if (currentLock.released || currentLock.revoked) {
        continue;
      }

      // Skip any locks that are not due for release
      if (currentLock.startTime.add(currentLock.lockDuration) >= now) {
        hasUnDueLocks = true;
        continue;
      }

      // The total token allowance must be greater than the number of locked tokens
      require(currentLock.amount <= token.allowance(allowanceProvider, address(this)));

      // Release Tokens
      UnlockedTokens(_beneficiary, currentLock.amount);
      tokenLocks[_beneficiary].locks[i].released = true;
      tokenLocks[_beneficiary].tokenBalance = tokenLocks[_beneficiary].tokenBalance.sub(currentLock.amount);
      totalTokensLocked = totalTokensLocked.sub(currentLock.amount);
      assert(token.transferFrom(allowanceProvider, _beneficiary, currentLock.amount));
    }

    // If there are no future locks to be released, delete the lock vault
    if (!hasUnDueLocks) {
      delete tokenLocks[_beneficiary];
      lockIndexes[lock.lockIndex] = 0x0;
    }

    return true;
  }
}
