// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Counter {
    uint256 public count;
    function inc() public { count += 1; }
    function dec() public { count -= 1; }
}
