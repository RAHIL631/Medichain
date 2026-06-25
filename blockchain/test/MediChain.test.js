const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MediChain", function () {
  let contract, owner, patient1, patient2, doctor1, doctor2, unauthorizedDoctor;

  beforeEach(async function () {
    [owner, patient1, patient2, doctor1, doctor2, unauthorizedDoctor] = await ethers.getSigners();

    const MediChain = await ethers.getContractFactory("MediChain");
    contract = await MediChain.deploy();
    await contract.waitForDeployment();

    // Register patient1 for all tests to use
    await contract.connect(patient1).registerPatient();
  });

  describe("Patient Registration", function () {
    it("should register patient and emit PatientRegistered event", async function () {
      const tx = await contract.connect(patient2).registerPatient();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(contract, "PatientRegistered")
        .withArgs(patient2.address, block.timestamp);
    });

    it("should set isRegistered[patient] = true", async function () {
      const isReg = await contract.isRegistered(patient1.address);
      expect(isReg).to.be.true;
    });

    it("should revert with 'Already registered' on duplicate registration", async function () {
      await expect(contract.connect(patient1).registerPatient())
        .to.be.revertedWith("MediChain: patient already registered");
    });

    it("should add patient to patientList array", async function () {
      await contract.connect(patient2).registerPatient();
      const patients = await contract.getAllPatients();
      expect(patients).to.include(patient1.address);
      expect(patients).to.include(patient2.address);
    });
  });

  describe("Doctor Access Control (Objective 5)", function () {
    it("should grant access and emit DoctorAccessGranted", async function () {
      const tx = await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "DoctorAccessGranted")
        .withArgs(patient1.address, doctor1.address, block.timestamp);
    });

    it("should return hasAccess = true after grant", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      const access = await contract.hasAccess(patient1.address, doctor1.address);
      expect(access).to.be.true;
    });

    it("should revert if unregistered patient tries to grant access", async function () {
      await expect(contract.connect(patient2).grantDoctorAccess(doctor1.address))
        .to.be.revertedWith("MediChain: caller is not a registered patient");
    });

    it("should revert if granting access to zero address", async function () {
      await expect(contract.connect(patient1).grantDoctorAccess(ethers.ZeroAddress))
        .to.be.revertedWith("MediChain: doctor address is zero");
    });

    it("should revert if granting access to already-authorized doctor", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await expect(contract.connect(patient1).grantDoctorAccess(doctor1.address))
        .to.be.revertedWith("MediChain: access already granted");
    });

    it("should revoke access and emit DoctorAccessRevoked", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      
      const tx = await contract.connect(patient1).revokeDoctorAccess(doctor1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "DoctorAccessRevoked")
        .withArgs(patient1.address, doctor1.address, block.timestamp);
    });

    it("should return hasAccess = false after revoke", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await contract.connect(patient1).revokeDoctorAccess(doctor1.address);
      const access = await contract.hasAccess(patient1.address, doctor1.address);
      expect(access).to.be.false;
    });

    it("should revert if revoking access doctor never had", async function () {
      await expect(contract.connect(patient1).revokeDoctorAccess(doctor2.address))
        .to.be.revertedWith("MediChain: access is not granted");
    });
  });

  describe("Medical Record Storage (Objective 1 + 2)", function () {
    const ipfsCID = "QmTestHash1234567890abcdef";
    const ipfsURL = "https://gateway.pinata.cloud/ipfs/QmTestHash1234567890abcdef";
    const recordType = "prescription";
    const notes = "Take twice daily";

    beforeEach(async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
    });

    it("should allow authorized doctor to addMedicalRecord and emit RecordAdded", async function () {
      const tx = await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "RecordAdded")
        .withArgs(patient1.address, doctor1.address, ipfsCID, recordType, block.timestamp);
    });

    it("should store IPFS CID exactly as provided in the struct", async function () {
      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      const records = await contract.connect(patient1).getMedicalRecords(patient1.address);
      expect(records[0].ipfsCID).to.equal(ipfsCID);
    });

    it("should store all struct fields correctly (ipfsURL, recordType, notes, uploadedBy, timestamp)", async function () {
      const tx = await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const records = await contract.connect(patient1).getMedicalRecords(patient1.address);
      const record = records[0];

      expect(record.ipfsURL).to.equal(ipfsURL);
      expect(record.recordType).to.equal(recordType);
      expect(record.notes).to.equal(notes);
      expect(record.uploadedBy).to.equal(doctor1.address);
      expect(record.timestamp).to.equal(block.timestamp);
      expect(record.isActive).to.be.true;
    });

    it("should increment record count after add", async function () {
      let count = await contract.getRecordCount(patient1.address);
      expect(count).to.equal(0n);

      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      
      count = await contract.getRecordCount(patient1.address);
      expect(count).to.equal(1n);
    });

    it("should revert unauthorized doctor from addMedicalRecord", async function () {
      await expect(
        contract.connect(unauthorizedDoctor).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes)
      ).to.be.revertedWith("MediChain: caller is not authorised for this patient");
    });

    it("should revert unregistered patient from addMedicalRecord", async function () {
      await expect(
        contract.connect(doctor1).addMedicalRecord(patient2.address, ipfsCID, ipfsURL, recordType, notes)
      ).to.be.revertedWith("MediChain: patient is not registered");
    });
  });

  describe("Record Retrieval Access", function () {
    const ipfsCID = "QmTestHash1234567890abcdef";
    const ipfsURL = "https://gateway.pinata.cloud/ipfs/QmTestHash1234567890abcdef";
    const recordType = "prescription";
    const notes = "Take twice daily";

    beforeEach(async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
    });

    it("should allow patient to read own records", async function () {
      const records = await contract.connect(patient1).getMedicalRecords(patient1.address);
      expect(records.length).to.equal(1);
      expect(records[0].ipfsCID).to.equal(ipfsCID);
    });

    it("should allow authorized doctor to read patient records", async function () {
      const records = await contract.connect(doctor1).getMedicalRecords(patient1.address);
      expect(records.length).to.equal(1);
      expect(records[0].ipfsCID).to.equal(ipfsCID);
    });

    it("should revert unauthorized doctor from reading records", async function () {
      await expect(
        contract.connect(unauthorizedDoctor).getMedicalRecords(patient1.address)
      ).to.be.revertedWith("MediChain: caller is not authorised for this patient");
    });

    it("should return empty array for patient with no records", async function () {
      await contract.connect(patient2).registerPatient();
      const records = await contract.connect(patient2).getMedicalRecords(patient2.address);
      expect(records.length).to.equal(0);
    });
  });

  describe("Record Deactivation", function () {
    const ipfsCID = "QmTestHash1234567890abcdef";
    const ipfsURL = "https://gateway.pinata.cloud/ipfs/QmTestHash1234567890abcdef";
    const recordType = "prescription";
    const notes = "Take twice daily";

    beforeEach(async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
    });

    it("should deactivate record by index", async function () {
      const tx = await contract.connect(patient1).deactivateRecord(patient1.address, 0);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "RecordDeactivated")
        .withArgs(patient1.address, 0, block.timestamp);

      const records = await contract.connect(patient1).getMedicalRecords(patient1.address);
      expect(records[0].isActive).to.be.false;
    });

    it("should revert non-patient from deactivating", async function () {
      await expect(
        contract.connect(doctor1).deactivateRecord(patient1.address, 0)
      ).to.be.revertedWith("MediChain: only the patient can deactivate records");
    });

    it("should revert with invalid index", async function () {
      await expect(
        contract.connect(patient1).deactivateRecord(patient1.address, 1)
      ).to.be.revertedWith("MediChain: record index out of bounds");
    });
  });

  describe("View Functions", function () {
    it("getAllPatients should return array with registered patients", async function () {
      await contract.connect(patient2).registerPatient();
      const patients = await contract.getAllPatients();
      expect(patients.length).to.equal(2);
      expect(patients[0]).to.equal(patient1.address);
      expect(patients[1]).to.equal(patient2.address);
    });

    it("getRecordCount should return correct count", async function () {
      const ipfsCID = "QmTestHash1234567890abcdef";
      const ipfsURL = "https://gateway.pinata.cloud/ipfs/QmTestHash1234567890abcdef";
      const recordType = "prescription";
      const notes = "Take twice daily";

      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      
      let count = await contract.getRecordCount(patient1.address);
      expect(count).to.equal(0n);

      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      await contract.connect(doctor1).addMedicalRecord(patient1.address, ipfsCID, ipfsURL, recordType, notes);
      
      count = await contract.getRecordCount(patient1.address);
      expect(count).to.equal(2n);
    });
  });
});
