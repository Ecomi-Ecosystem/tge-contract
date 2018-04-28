pragma solidity ^0.4.18;

import "./OMIToken.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";

/**
@title OMITokenLock
@dev OMITokenLock is a token holder contract that will allow multiple beneficiaries to extract the tokens after a given release time. It is a modification of the OpenZeppenlin TokenLock to allow for one token lock smart contract for many beneficiaries. 
 */
contract OMITokenLock is Ownable {
  using SafeMath for uint256;

  function OMITokenLock (OMIToken _token) public {
    token = _token;
  }

  OMIToken public token;

  event CrowdsaleFinished();

  bool public crowdsaleFinished = false;

  uint256 public crowdsaleEndTime;

  /*
  @notice Marks the crowdsale as being finished and sets the crowdsale finish date.
  */
  function finishCrowdsale() public onlyOwner {
    require(!crowdsaleFinished);
    crowdsaleFinished = true;
    crowdsaleEndTime = now;
    CrowdsaleFinished();
  }

  struct Lock {
    uint256 amount;
    uint256 lockDuration;
    bool released;
  }

  struct TokenLockVault {
    address beneficiary;
    uint256 tokenBalance;
    uint256 lockIndex;
    Lock[] locks;
  }

  mapping(address => TokenLockVault) public tokenLocks;

  address[] public lockIndexes;

  uint256 public contractTokenBalance = 0;

  /*
  @notice Gets the total amount of tokens for a given address.
  @param _beneficiary The address for which to look up the total token amount.
  */
  function getTokenBalance(address _beneficiary) public view returns (uint) {
    return tokenLocks[_beneficiary].tokenBalance;
  }

  event LockedTokens(address indexed beneficiary, uint256 amount, uint256 releaseTime);

  /*
  @notice Locks tokens for a given beneficiary.
  @param _beneficiary The address to which the tokens will be released.
  @param _lockDuration The duration of time that must elapse after the crowdsale end date.
  @param _tokens The amount of tokens to be locked. 
  */
  function lockTokens(address _beneficiary, uint256 _lockDuration, uint256 _tokens) external onlyOwner  {
    // Lock duration must be greater than zero seconds
    require(_lockDuration >= 0);
    // Token amount must be greater than zero
    require(_tokens > 0);
    // Tokens must be transfered to this contract prior to locking them
    uint256 newTokenBalance = token.balanceOf(address(this));
    require(_tokens == newTokenBalance.sub(contractTokenBalance));

    TokenLockVault storage lock = tokenLocks[_beneficiary];

    // If this is the first lock for this beneficiary, add their address to the lock indexes
    if (lock.beneficiary == 0) {
      lock.beneficiary = _beneficiary;
      lock.lockIndex = lockIndexes.length;
      lockIndexes.push(_beneficiary);
    }

    // Add the lock
    lock.locks.push(Lock(_tokens, _lockDuration, false));

    // Update the total tokens for this beneficiary
    lock.tokenBalance = lock.tokenBalance.add(_tokens);

    // Update the number of locked tokens
    contractTokenBalance = newTokenBalance; 

    LockedTokens(_beneficiary, _tokens, _lockDuration);
  }

  event UnlockedTokens(address indexed beneficiary, uint256 amount);

  /* 
  @notice Reviews and releases token for a given beneficiary. 
  */
  function _release(address _beneficiary) internal returns (bool) {
    TokenLockVault memory lock = tokenLocks[_beneficiary];
    require(lock.beneficiary == _beneficiary);

    bool hasUnDueLocks = false;
    bool hasReleasedToken = false;

    for (uint256 i = 0; i < lock.locks.length; i = i.add(1)) {
      Lock memory currentLock = lock.locks[i];
      // Skip any locks which are already released 
      if (currentLock.released) {
        continue;
      }
      
      // Skip any locks that are not due for release
      if (crowdsaleEndTime.add(currentLock.lockDuration) >= now) {
        hasUnDueLocks = true;
        continue;
      }

      // The amount of tokens to transfer must be less than the number of locked tokens
      require(currentLock.amount <= token.balanceOf(address(this)));

      // Release Tokens
      UnlockedTokens(msg.sender, currentLock.amount);
      hasReleasedToken = true;
      tokenLocks[_beneficiary].locks[i].released = true;
      tokenLocks[_beneficiary].tokenBalance = tokenLocks[_beneficiary].tokenBalance.sub(currentLock.amount);
      contractTokenBalance = contractTokenBalance.sub(currentLock.amount);
      assert(token.transfer(msg.sender, currentLock.amount));
    }

    // If there are no future locks to be released, delete the lock vault
    if (!hasUnDueLocks) {
      delete tokenLocks[msg.sender];
      lockIndexes[lock.lockIndex] = 0x0;
    }

    return hasReleasedToken;
  }

  /*
  @notice Transfers any tokens held in a timelock vault to beneficiary if they are due for release.
  */
  function releaseTokens() public returns(bool) {
    require(crowdsaleFinished);
    require(_release(msg.sender));
    return true;
  }

  /*
  @notice Transfers tokens held by timelock to all beneficiaries within the provided range.
  @param from the start lock index
  @param to the end lock index
  */
  function releaseAll(uint256 from, uint256 to) external onlyOwner returns (bool) {
    require(from >= 0);
    require(from < to);
    require(to <= lockIndexes.length);
    require(crowdsaleFinished);

    for (uint256 i = from; i < to; i = i.add(1)) {
      address _beneficiary = lockIndexes[i];

      //Skip any previously removed locks
      if (_beneficiary == 0x0) {
        continue;
      }

      require(_release(_beneficiary));
    }
    return true;
  }
}
