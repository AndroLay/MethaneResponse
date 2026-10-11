// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EvidenceRegistry
/// @notice Records the SHA-256 digest of off-chain evidence bundles; does not attest physical methane repair.
contract EvidenceRegistry {
    error NotOwner();
    error NotIssuer();
    error InvalidInput();
    error DifferentIssuer();
    address public immutable owner;
    mapping(address => bool) public isIssuer;

    struct Receipt {
        address issuer;
        bytes32 bundleHash;
        uint64 version;
        uint64 updatedAt;
    }
    mapping(bytes32 => Receipt) public receipts;
    event IssuerUpdated(address indexed issuer, bool enabled);
    event Anchored(bytes32 indexed caseId, address indexed issuer, bytes32 bundleHash, uint64 version);

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
        emit IssuerUpdated(msg.sender, true);
    }

    function setIssuer(address issuer, bool enabled) external {
        if (msg.sender != owner) revert NotOwner();
        if (issuer == address(0)) revert InvalidInput();
        isIssuer[issuer] = enabled;
        emit IssuerUpdated(issuer, enabled);
    }

    function anchor(bytes32 caseId, bytes32 bundleHash) external {
        if (!isIssuer[msg.sender]) revert NotIssuer();
        if (caseId == bytes32(0) || bundleHash == bytes32(0)) revert InvalidInput();
        Receipt storage current = receipts[caseId];
        if (current.version != 0 && current.issuer != msg.sender) revert DifferentIssuer();
        uint64 nextVersion = current.version + 1;
        current.issuer = msg.sender;
        current.bundleHash = bundleHash;
        current.version = nextVersion;
        current.updatedAt = uint64(block.timestamp);
        emit Anchored(caseId, msg.sender, bundleHash, nextVersion);
    }
}

