// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '../src/EvidenceRegistry.sol';

contract UntrustedCaller {
    function attempt(EvidenceRegistry registry, bytes32 caseId, bytes32 digest) external returns (bool) {
        try registry.anchor(caseId, digest) { return true; } catch { return false; }
    }
}

contract EvidenceRegistryTest {
    EvidenceRegistry private registry;
    function setUp() public { registry = new EvidenceRegistry(); }

    function testIssuerCanAnchorAndRevise() public {
        setUp();
        bytes32 caseId = keccak256('case-a');
        registry.anchor(caseId, keccak256('bundle1'));
        (,bytes32 storedHash,uint64 version,) = registry.receipts(caseId);
        require(storedHash == keccak256('bundle1') && version == 1, 'first receipt invalid');
        registry.anchor(caseId, keccak256('bundle2'));
        (,storedHash,version,) = registry.receipts(caseId);
        require(storedHash == keccak256('bundle2') && version == 2, 'revision not monotonic');
    }

    function testUntrustedAccountCannotAnchor() public {
        setUp();
        UntrustedCaller caller = new UntrustedCaller();
        bool allowed = caller.attempt(registry, keccak256('case-a'), keccak256('bundle1'));
        require(!allowed, 'untrusted caller unexpectedly succeeded');
    }

    function testAuthorizedSecondIssuerCannotOverwriteOtherIssuersCase() public {
        setUp();
        bytes32 caseId = keccak256('case-a');
        registry.anchor(caseId, keccak256('owner-bundle'));
        UntrustedCaller caller = new UntrustedCaller();
        registry.setIssuer(address(caller), true);
        require(!caller.attempt(registry, caseId, keccak256('replacement')), 'second issuer overwrote case');
        require(caller.attempt(registry, keccak256('new-case'), keccak256('new-bundle')), 'issuer should anchor own case');
    }

    function testCannotAnchorEmptyHash() public {
        setUp();
        try registry.anchor(keccak256('case-a'), bytes32(0)) {
            revert('empty digest accepted');
        } catch {}
    }
}

