// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Ask Ismène Booth
/// @notice Takes USDC payments and logs questions on-chain. No minting logic here.
/// @dev Very small surface: USDC address, treasury, fixed prices, ask().
contract AskIsmeneBooth is Ownable, Pausable {
    /// @notice USDC token used for payment (6 decimals on Base)
    IERC20 public immutable usdc;

    /// @notice Address that receives USDC payments (your Safe or wallet)
    address public treasury;

    /// @notice Prices in USDC smallest unit (6 decimals): 30, 60, 80
    uint256 public constant PRICE_HAIKU   = 30_000_000; // 30 USDC
    uint256 public constant PRICE_VISUAL  = 60_000_000; // 60 USDC
    uint256 public constant PRICE_OMAKASE = 80_000_000; // 80 USDC

    enum Format {
        Haiku,      // 0
        Visual,     // 1
        Omakase     // 2
    }

    /// @notice Emitted when someone pays + submits a question
    event QuestionAsked(
        address indexed asker,
        Format format,
        uint256 pricePaid,
        string question
    );

    error ZeroAddress();
    error InvalidFormat();

    // Ownable in OZ v5 takes the initial owner in its constructor
    constructor(address usdcAddress, address treasuryAddress)
        Ownable(msg.sender)
    {
        if (usdcAddress == address(0)) revert ZeroAddress();
        if (treasuryAddress == address(0)) revert ZeroAddress();

        usdc = IERC20(usdcAddress);
        treasury = treasuryAddress;
    }

    /// @notice Change the treasury address (where USDC goes)
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
    }

    /// @notice Get the price in USDC units for a given format
    function getPrice(Format format) public pure returns (uint256) {
        if (format == Format.Haiku) return PRICE_HAIKU;
        if (format == Format.Visual) return PRICE_VISUAL;
        if (format == Format.Omakase) return PRICE_OMAKASE;
        revert InvalidFormat();
    }

    /// @notice User-facing entry: pay USDC + send question
    /// @dev Requires prior approval of USDC to this contract.
    function ask(string calldata question, Format format)
        external
        whenNotPaused
    {
        uint256 price = getPrice(format);

        // Pull exactly `price` USDC from caller to treasury
        bool ok = usdc.transferFrom(msg.sender, treasury, price);
        require(ok, "USDC transfer failed");

        emit QuestionAsked(msg.sender, format, price, question);
    }

    /// @notice Pause questions/payments in case of emergency
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume questions/payments
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Reject direct ETH transfers
    receive() external payable {
        revert();
    }

    /// @notice Reject unknown function calls
    fallback() external payable {
        revert();
    }
}
