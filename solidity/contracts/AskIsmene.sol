// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract AskIsmene is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _tokenIdCounter;

    constructor(address royaltyReceiver, uint96 royaltyFeeBps)
        ERC721("Ask Ismene", "ISMENE")
        Ownable(msg.sender)
    {
        _setDefaultRoyalty(royaltyReceiver, royaltyFeeBps); // e.g. 750 = 7.5%
    }

    /// Owner-mint only
    function mintTo(address to, string memory uri) external onlyOwner {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Correct override list for OZ v5: ERC721URIStorage overrides supportsInterface (EIP-4906), and ERC2981 does too
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

