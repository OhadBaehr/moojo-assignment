## MOOJO ASSIGNMENT README

### CredentialManager Smart Contract

**CredentialManager** is a smart contract for managing credentials. It enables the creation of credential types, assignment of credentials to users, and retrieval of user credentials.

---

### Setup and Deployment Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/OhadBaehr/moojo-assignment.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test the contract:
   ```bash
   npm run test
   ```
---

### Overview of Technical Design Choices

1. **Upgradeable Contracts**:
   - Used OpenZeppelin's `Initializable` and `OwnableUpgradeable` for upgradeability and ownership management.

2. **Credential Structure**:
   - `CredentialType`: Stores metadata about credential types (e.g., "NBA Player").
   - `UserCredential`: Links users to credential types and associated metadata via hashes.

3. **Hashing and Metadata**:
   - Used `keccak256` to generate unique type and metadata hashes for integrity and immutability.
   - Metadata is designed to be stored off-chain via decentralized storage solutions like IPFS or centralized storage systems (traditional database solutions), with the on-chain hash serving as a reference for validation.

4. **Event-Driven Architecture**:
   - Emitted events like `CredentialTypeCreated` and `CredentialAssigned` enable real-time tracking and integration with other applications.

5. **Testing Framework**:
   - Used Hardhat and Chai for unit testing and event verification.
   - Covers all critical functions, including creation, assignment, and retrieval of credentials.
---

#### Assumptions:
1. Credential metadata is stored off-chain.
2. `msg.sender` is assumed to represent trusted entities issuing credentials.

#### Limitations:
1. Metadata storage relies on off-chain systems.
2. The system does not include mechanisms for revoking credentials.
3. No role-based access control for issuers, limiting fine-grained permissions.
4. The contract is limited to Ethereum-compatible networks using Solidity v0.8.0 or higher.