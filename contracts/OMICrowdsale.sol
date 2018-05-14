pragma solidity ^0.4.18;

import "./OMIToken.sol";
import "./OMITokenLock.sol";
import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol";

/// @title OMICrowdsale
/// @author Mikel Duffy - <mikel@ecomi.com>
contract OMICrowdsale is WhitelistedCrowdsale, Pausable {
  using SafeMath for uint256;

  /* 
   *  Constants
   */
  uint256 constant crowdsaleStartTime = 1530316800;
  uint256 constant crowdsaleFinishTime = 1538351999;
  uint256 constant crowdsaleUSDGoal = 44625000;
  uint256 constant crowdsaleTokenGoal = 500000000;

  /*
   *  Storage
   */
  OMIToken public token;
  OMITokenLock public tokenLock;

  uint256 public currentStage;
  struct Stage {
    uint256 discountPercentage;
    uint256 minimumTokenPurchase;
    uint256 maximumTokenPurchase;
    uint256 maximumTokenTotal;
    uint256 currentTokenTotal;
  }
  Stage[] public stages;
  uint256 currentDiscountAmount;
  uint256 public totalUSDRaised;
  uint256 public totalTokensSold;
  bool public isFinalized = false;

  // index 0 == presale1, index 1 == presale2, index 2 == main crowdsale
  mapping(address => uint256[3]) public purchaseRecords;

  /*
   *  Events
   */
  event RateChanged(uint256 newRate);
  event USDRaisedUpdated(uint256 newTotal);
  event StageChanged(uint256 newStage);
  event Finalized();

  /*
   *  Public Functions
   */
  /// @dev Contract constructor sets...
  function OMICrowdsale (
    uint256 _startingRate,
    address _ETHWallet,
    address _OMIToken,
    address _OMITokenLock
  )
    Crowdsale(_startingRate, _ETHWallet, ERC20(_OMIToken))
    public
  {
    token = OMIToken(_OMIToken);
    tokenLock = OMITokenLock(_OMITokenLock);

    Stage memory preSaleRound1 = Stage(40,25000,5000000,50000000,0);
    Stage memory preSaleRound2 = Stage(30,25000,5000000,50000000,0);
    Stage memory mainCrowdsale = Stage(0,2500,1000000,362500000,0);
    stages.push(preSaleRound1);
    stages.push(preSaleRound2);
    stages.push(mainCrowdsale);
    currentStage = 0;

    rate = _applyDiscount(_startingRate);
  }

  /// @dev Allows the owner to set the current rate for calculating the number of tokens for a purchase.
  /// @dev An external cron job will fetch the ETH/USD daily average from the cryptocompare API and call this function.
  function setRate(uint256 _newRate)
    public
    onlyOwner
    whenNotPaused
    returns(bool)
  {
    _updateRate(_newRate);
    return true;
  }

  /// @dev Allows the owner to update the total amount of USD raised. T
  function setUSDRaised(uint256 _total)
    public
    onlyOwner
    whenNotPaused
  {
    totalUSDRaised = _total;
    USDRaisedUpdated(_total);
  }

  /// @dev Gets the purchase records for a given address
  /// @param _beneficiary Tokan purchaser
  function getPurchaseRecords(address _beneficiary) 
    public 
    view 
    isWhitelisted(_beneficiary)
    returns(uint256[3])
  {
    return purchaseRecords[_beneficiary];
  }

  /// @dev Get the number of tokens sold for a given stage
  /// @param targetStage The stage for which the number of tokens sold will be returned
  function getTokensSold(uint256 targetStage) 
    public
    view
    returns (uint256) 
  {
    require(targetStage >= 0);
    require(targetStage <= 2);
    return stages[targetStage].currentTokenTotal;
  }

  /*
   *  Internal Functions
   */
  /// @dev Applies the current stage's discount to the provided rate
  /// @param _rate The rate upon which the discount is applied
  function _applyDiscount(uint256 _rate) internal returns (uint256){
    require(stages[currentStage].discountPercentage > 0);
    currentDiscountAmount = _rate.mul(stages[currentStage].discountPercentage).div(100);
    return _rate.sub(currentDiscountAmount);
  }

  /// @dev Handles updating the rate for the token
  /// @param _newRate The pre-discount amount of wei for one token.
  function _updateRate(uint256 _newRate)
    internal
  {
    require(_newRate > 0);

    uint updatedRate = _newRate;

    if (currentStage <= 1) {
      updatedRate = _applyDiscount(updatedRate);
    }

    rate = updatedRate;
    RateChanged(rate);
  }

  /// @dev Extend parent behavior to check if current stage should close. Must call super to ensure the enforcement of the whitelist.
  /// @param _beneficiary Token purchaser
  /// @param _weiAmount Amount of wei contributed
  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
    internal
   {
    super._preValidatePurchase(_beneficiary, _weiAmount);

    // Crowdsale should not be paused
    require(!paused);

    // Crowdsale should not be finalized
    require(!isFinalized);

    uint256 _tokenAmount = _weiAmount.div(rate);

    // Beneficiary's total for current stage should be between the minimum and maximum purchase amounts
    uint256 _stageTotal = purchaseRecords[_beneficiary][currentStage].add(_tokenAmount);
    require(_stageTotal >= stages[currentStage].minimumTokenPurchase);
    require(_stageTotal <= stages[currentStage].maximumTokenPurchase);

    // Must make the purchase from the intended whitelisted address
    require(msg.sender == _beneficiary);

    // Should be less than the remaining amount for presale stages (go all the way to 500mm token for main crowdsale stage)
    if (currentStage <= 1) {
      require(stages[currentStage].currentTokenTotal.add(_tokenAmount) <= stages[currentStage].maximumTokenTotal);
    }

    // If on Main Crowdsale time must be after the start time
    if (currentStage == 2){
      require(now >= crowdsaleStartTime);
    }
  }

  /// @dev Override to extend the way in which ether is converted to tokens.
  /// @param _weiAmount Value in wei to be converted into tokens
  /// @return Number of tokens that can be purchased with the specified _weiAmount
  function _getTokenAmount(uint256 _weiAmount)
    internal
    view
    returns (uint256)
  {
    return _weiAmount.div(rate);
  }

  /// @dev Overrides parent by storing balances in timelock contract instead of issuing tokens right away.
  /// @param _beneficiary Token purchaser
  /// @param _tokenAmount Amount of tokens purchased
  function _processPurchase(address _beneficiary, uint256 _tokenAmount)
    internal
  {
    uint day = 86400;

    // Lock beneficiary's tokens
    // Stage 0 and 1 should lock the 1/3 of the beneficiary's tokens at 30, 60, and 90 days after the crowdsale ends
    if(currentStage == 0 || currentStage == 1){
      uint256 oneThirdOfTokens = _tokenAmount.mul(100).div(300);
      uint256 remainingTokens = _tokenAmount.sub(oneThirdOfTokens.mul(2));

      tokenLock.lockTokens(_beneficiary, day.mul(30), oneThirdOfTokens);
      tokenLock.lockTokens(_beneficiary, day.mul(60), oneThirdOfTokens);
      tokenLock.lockTokens(_beneficiary, day.mul(90), remainingTokens);
    }

    // Stage 2 should lock all token until 7 days after the crowdsale ends
    if(currentStage == 2) {
      tokenLock.lockTokens(_beneficiary, day.mul(7), _tokenAmount);
    }
  }

  /// @dev Override for extensions that require an internal state to check for validity (current user contributions, etc.)
  /// @param _beneficiary Address receiving the tokens
  /// @param _weiAmount Value in wei involved in the purchase
  function _updatePurchasingState(address _beneficiary, uint256 _weiAmount)
    internal
  {
    uint256 _tokenAmount = _weiAmount.div(rate);

    // Add token amount to the purchase history
    purchaseRecords[_beneficiary][currentStage] = purchaseRecords[_beneficiary][currentStage].add(_tokenAmount);
    
    // Add token amount to the token total for the current stage
    stages[currentStage].currentTokenTotal = stages[currentStage].currentTokenTotal.add(_tokenAmount);

    // Add token amount to total tokens sold
    totalTokensSold = totalTokensSold.add(_tokenAmount);

    // On Presale Stages advance the stage if this is the last purchase
    if (
      currentStage <= 1 && 
      stages[currentStage].maximumTokenTotal.sub(stages[currentStage].currentTokenTotal) < stages[currentStage].minimumTokenPurchase
    ) {
      currentStage = currentStage.add(1);
      _updateRate(rate.add(currentDiscountAmount));
      StageChanged(currentStage);
    }

    // Move on to crowdsale if presale rounds have not sold already
    if ( currentStage <= 1 && now > crowdsaleStartTime) {
      currentStage = 2;
      _updateRate(rate.add(currentDiscountAmount));
      StageChanged(currentStage);
    }

    // On Main Crowdsale, finish the crowdsale...
    if (currentStage == 2) {

      // ...if there is not a minimum purchase left
      if (crowdsaleTokenGoal.sub(totalTokensSold) < stages[currentStage].minimumTokenPurchase) {
        _finalization();
      }

      // ...if USD funding goal has been reached
      if (totalUSDRaised >= crowdsaleUSDGoal) {
        _finalization();
      }

      // ...if the time is after the crowdsale end time
      if (now > crowdsaleFinishTime) {
        _finalization();
      }
    }
  }

  /// @dev Finalizes crowdsale
  function _finalization()
    internal
  {
    require(!isFinalized);
    isFinalized = true;
    tokenLock.finishCrowdsale();
    Finalized();
  }
}
