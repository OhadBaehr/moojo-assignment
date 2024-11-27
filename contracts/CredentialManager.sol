// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title CredentialManager
 * @dev Smart contract to manage credential creation, assignment, and retrieval.
 */
contract CredentialManager is Initializable, OwnableUpgradeable {
    struct CredentialType {
        string name; // Name of the credential type (e.g., "NBA Player")
        address creator; // Creator of the credential type
        bool exists; // Ensures the type exists
    }

    struct UserCredential {
        bytes32 typeHash; // Hash of the credential type
        bytes32 metadataHash; // Hash of off-chain metadata
        address issuer; // Address of the credential issuer
    }

    mapping(bytes32 => CredentialType) private credentialTypes; // Credential types by typeHash
    mapping(address => UserCredential[]) private userCredentials; // User credentials

    // Events
    event CredentialTypeCreated(bytes32 indexed typeHash, string name, address indexed creator);
    event CredentialAssigned(
        address indexed user,
        bytes32 indexed typeHash,
        bytes32 indexed metadataHash,
        address issuer
    );

    /**
     * @dev Initializes the contract.
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    /**
     * @dev Creates a new credential type.
     * @param _name The name of the credential type.
     */
    function createCredentialType(string memory _name) external {
        bytes32 typeHash = keccak256(abi.encodePacked(_name, msg.sender));
        require(!credentialTypes[typeHash].exists, "Credential type already exists");

        credentialTypes[typeHash] = CredentialType({
            name: _name,
            creator: msg.sender,
            exists: true
        });

        emit CredentialTypeCreated(typeHash, _name, msg.sender);
    }

    /**
     * @dev Assigns a credential to a user.
     * @param _user The address of the user to whom the credential is being assigned.
     * @param _typeHash The hash of the credential type.
     * @param _metadataHash The hash of the off-chain metadata.
     */
    function assignCredential(
        address _user,
        bytes32 _typeHash,
        bytes32 _metadataHash
    ) external {
        require(_user != address(0), "Invalid user address");
        require(credentialTypes[_typeHash].exists, "Invalid credential type");

        userCredentials[_user].push(UserCredential({
            typeHash: _typeHash,
            metadataHash: _metadataHash,
            issuer: msg.sender
        }));

        emit CredentialAssigned(_user, _typeHash, _metadataHash, msg.sender);
    }

    /**
     * @dev Retrieves all credentials for a user.
     * @param _user The address of the user.
     * @return An array of UserCredential structs.
     */
    function getUserCredentials(address _user) external view returns (UserCredential[] memory) {
        return userCredentials[_user];
    }

    /**
     * @dev Retrieves details of a credential type.
     * @param _typeHash The hash of the credential type.
     * @return The CredentialType struct.
     */
    function getCredentialType(bytes32 _typeHash) external view returns (CredentialType memory) {
        require(credentialTypes[_typeHash].exists, "Credential type does not exist");
        return credentialTypes[_typeHash];
    }
}
