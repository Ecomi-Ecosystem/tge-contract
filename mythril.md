# Analysis results for OMICrowdsale.json

## Exception state

- Type: Informational
- Contract: OMICrowdsale
- Function name: `_function_0x8c10671c`
- PC address: 3025

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *OMICrowdsale.json:35*

```
56) public purcha
```
# Analysis results for OMIToken.json

## Exception state

- Type: Informational
- Contract: OMIToken
- Function name: `_function_0xd73dd623`
- PC address: 4863

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *OMIToken.json:12*


## Integer Overflow 

- Type: Warning
- Contract: OMIToken
- Function name: `_function_0xd73dd623`
- PC address: 4850

### Description

A possible integer overflow exists in the function `_function_0xd73dd623`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *OMIToken.json:12*

# Analysis result for SafeMath

No issues found.
# Analysis results for CappedToken.json

## Exception state

- Type: Informational
- Contract: CappedToken
- Function name: `_function_0xd73dd623`
- PC address: 5340

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *CappedToken.json:32*


## Integer Overflow 

- Type: Warning
- Contract: CappedToken
- Function name: `_function_0xd73dd623`
- PC address: 5327

### Description

A possible integer overflow exists in the function `_function_0xd73dd623`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *CappedToken.json:32*

# Analysis results for BasicToken.json

## Exception state

- Type: Informational
- Contract: BasicToken
- Function name: `_function_0xa9059cbb`
- PC address: 992

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *BasicToken.json:44*

```
f.
  * @return
```
# Analysis results for OMITokenLock.json

## Exception state

- Type: Informational
- Contract: OMITokenLock
- Function name: `_function_0x1374eb6f`
- PC address: 2590

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *OMITokenLock.json:130*

```
tokenLocks[_beneficiary].locks[_lockIndex]
```

## Exception state

- Type: Informational
- Contract: OMITokenLock
- Function name: `_function_0x8cc5e56e`
- PC address: 6628

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *OMITokenLock.json:25*

```
 uint256 lockD
```

## Exception state

- Type: Informational
- Contract: OMITokenLock
- Function name: `_function_0xe729b416`
- PC address: 6052

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *OMITokenLock.json:36*

```
address[] public lockIndexes
```

## Message call to external contract

- Type: Informational
- Contract: OMITokenLock
- Function name: `_function_0xa25983e5`
- PC address: 4532

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In *OMITokenLock.json:167*

```
token.allowance(allowanceProvider, address(this))
```

## Integer Overflow 

- Type: Warning
- Contract: OMITokenLock
- Function name: `_function_0x8cc5e56e`
- PC address: 3777

### Description

A possible integer overflow exists in the function `_function_0x8cc5e56e`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *OMITokenLock.json:145*

```
tokenLocks[_beneficiary].locks[_lockIndex]
```

## Integer Overflow 

- Type: Warning
- Contract: OMITokenLock
- Function name: `_function_0x8cc5e56e`
- PC address: 3778

### Description

A possible integer overflow exists in the function `_function_0x8cc5e56e`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *OMITokenLock.json:145*

```
tokenLocks[_beneficiary].locks[_lockIndex]
```
# Analysis results for StandardToken.json

## Exception state

- Type: Informational
- Contract: StandardToken
- Function name: `_function_0xd73dd623`
- PC address: 4098

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *StandardToken.json:32*

```
der].sub(_valu
```

## Integer Overflow 

- Type: Warning
- Contract: StandardToken
- Function name: `_function_0xd73dd623`
- PC address: 4085

### Description

A possible integer overflow exists in the function `_function_0xd73dd623`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *StandardToken.json:32*

```
om][m
```
# Analysis results for MintableToken.json

## Exception state

- Type: Informational
- Contract: MintableToken
- Function name: `_function_0xd73dd623`
- PC address: 5589

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *MintableToken.json:36*

```
turn true;
  }
```

## Integer Overflow 

- Type: Warning
- Contract: MintableToken
- Function name: `_function_0xd73dd623`
- PC address: 5576

### Description

A possible integer overflow exists in the function `_function_0xd73dd623`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *MintableToken.json:35*

```
nt);

```
# Analysis results for Crowdsale.json

## Exception state

- Type: Informational
- Contract: Crowdsale
- Function name: `_function_0xec8ac4d8`
- PC address: 1043

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *Crowdsale.json:10*

```
rovide additional

```
# Analysis result for Pausable

No issues found.
# Analysis results for PausableToken.json

## Exception state

- Type: Informational
- Contract: PausableToken
- Function name: `_function_0xd73dd623`
- PC address: 5428

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking. 
In *PausableToken.json:33*


## Integer Overflow 

- Type: Warning
- Contract: PausableToken
- Function name: `_function_0xd73dd623`
- PC address: 5415

### Description

A possible integer overflow exists in the function `_function_0xd73dd623`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In *PausableToken.json:33*

# Analysis result for Ownable

No issues found.
