import { expect } from "chai";
import { ethers, HDNodeWallet, TransactionResponse } from "ethers";
import CredentialManagerArtifact from "../artifacts/contracts/CredentialManager.sol/CredentialManager.json";
import { BaseContract, BytesLike } from "ethers";

export interface CredentialManager extends BaseContract {
  createCredentialType(
    name: string,
    overrides?: Record<string, unknown>
  ): Promise<TransactionResponse>;

  assignCredential(
    user: string,
    typeHash: BytesLike,
    metadataHash: BytesLike,
    overrides?: Record<string, unknown>
  ): Promise<TransactionResponse>;

  getCredentialType(
    typeHash: BytesLike
  ): Promise<{
    name: string;
    creator: string;
    exists: boolean;
  }>;

  getUserCredentials(
    user: string
  ): Promise<
    Array<{
      typeHash: string;
      metadataHash: string;
      issuer: string;
    }>
  >;

  connect(wallet: HDNodeWallet): CredentialManager;
}

describe("CredentialManager User Journey", function () {
  let provider: ethers.JsonRpcProvider;
  let deployerWallet: ethers.HDNodeWallet;
  let userWallet: ethers.HDNodeWallet;
  let issuerWallet: ethers.HDNodeWallet;
  let credentialManager: CredentialManager;
  let typeHash: string;

  const SECOND_CREDENTIAL_METADATA = {
    nickname: "Bobby the Legend",
    preferred_hand: "Left",
    career_high_score: 72,
    championships_won: 3,
    hall_of_fame_status: "Eligible",
  };

  const FIRST_CREDENTIAL_METADATA = {
    team: "Los Angeles Lakers",
    position: "Forward",
    years_of_experience: 20,
    career_points: 38652,
  };

  const FIRST_METADATA_HASH = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(FIRST_CREDENTIAL_METADATA)));
  const SECOND_METADATA_HASH = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(SECOND_CREDENTIAL_METADATA)));

  let transactions: {
    createTypeTx: TransactionResponse;
    assignFirstTx: TransactionResponse;
    assignSecondTx: TransactionResponse;
  };

  before(async function () {
    // Setup provider and wallets
    provider = new ethers.JsonRpcProvider("http://localhost:8545");
    deployerWallet = ethers.Wallet.createRandom().connect(provider);
    userWallet = ethers.Wallet.createRandom().connect(provider);
    issuerWallet = ethers.Wallet.createRandom().connect(provider);

    // Fund wallets
    const funder = await provider.getSigner();
    const fundingAmount = ethers.parseEther("10");
    await Promise.all([
      funder.sendTransaction({ to: deployerWallet.address, value: fundingAmount }),
      funder.sendTransaction({ to: userWallet.address, value: fundingAmount }),
      funder.sendTransaction({ to: issuerWallet.address, value: fundingAmount }),
    ]);

    // Deploy the CredentialManager contract
    const factory = new ethers.ContractFactory(
      CredentialManagerArtifact.abi,
      CredentialManagerArtifact.bytecode,
      deployerWallet
    );
    credentialManager = (await factory.deploy()) as CredentialManager;
    await credentialManager.waitForDeployment();

    // Create credential type
    const typeName = "NBA Player";
    const createTypeTx = await credentialManager.connect(issuerWallet).createCredentialType(typeName);
    const createReceipt = await createTypeTx.wait();
    if (!createReceipt) {
      throw new Error("Transaction receipt not found");
    }
    const iface = new ethers.Interface(CredentialManagerArtifact.abi);
    const event = createReceipt.logs.map((log) => iface.parseLog(log)).find((e) => e?.name === "CredentialTypeCreated");
    if (!event) {
      throw new Error("CredentialTypeCreated event not found");
    }
    typeHash = event.args.typeHash;

    // Assign credentials
    const assignFirstTx = await credentialManager
      .connect(issuerWallet)
      .assignCredential(userWallet.address, typeHash, FIRST_METADATA_HASH);
    await assignFirstTx.wait();

    const assignSecondTx = await credentialManager
      .connect(issuerWallet)
      .assignCredential(userWallet.address, typeHash, SECOND_METADATA_HASH);
    await assignSecondTx.wait();

    transactions = {
      createTypeTx,
      assignFirstTx,
      assignSecondTx,
    };
  });

  it("should verify the credential type was created", async function () {
    const credentialType = await credentialManager.getCredentialType(typeHash);
    expect(credentialType.name).to.equal("NBA Player");
    expect(credentialType.creator).to.equal(issuerWallet.address);
    expect(credentialType.exists).to.be.true;
  });

  it("should verify the first credential assignment", async function () {
    const assignReceipt = await transactions.assignFirstTx.wait();
    if (!assignReceipt) {
      throw new Error("Transaction receipt not found");
    }
    const iface = new ethers.Interface(CredentialManagerArtifact.abi);
    const event = assignReceipt.logs.map((log) => iface.parseLog(log)).find((e) => e?.name === "CredentialAssigned");

    if (!event) {
      throw new Error("CredentialAssigned event not found");
    }

    expect(event.args.user).to.equal(userWallet.address);
    expect(event.args.typeHash).to.equal(typeHash);
    expect(event.args.metadataHash).to.equal(FIRST_METADATA_HASH);
    expect(event.args.issuer).to.equal(issuerWallet.address);
  });

  it("should retrieve all credentials for the user", async function () {
    const allUserCredentials = await credentialManager.getUserCredentials(userWallet.address);
    expect(allUserCredentials.length).to.equal(2);

    const [firstCredential, secondCredential] = allUserCredentials;

    expect(firstCredential.typeHash).to.equal(typeHash);
    expect(firstCredential.metadataHash).is.not.null;
    expect(firstCredential.issuer).to.equal(issuerWallet.address);

    expect(secondCredential.typeHash).to.equal(typeHash);
    expect(secondCredential.metadataHash).is.not.null;
    expect(secondCredential.issuer).to.equal(issuerWallet.address);
  });

  it("should verify metadata hash consistency", async function () {
    const allUserCredentials = await credentialManager.getUserCredentials(userWallet.address);
    const [firstCredential, secondCredential] = allUserCredentials;
    
    expect(firstCredential.metadataHash).to.equal(FIRST_METADATA_HASH);
    expect(secondCredential.metadataHash).to.equal(SECOND_METADATA_HASH);
  });
});
