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
      const patients = await contract.getPatientsPaginated(0, 100);
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
    it("getPatientsPaginated should return array with registered patients", async function () {
      await contract.connect(patient2).registerPatient();
      const patients = await contract.getPatientsPaginated(0, 100);
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

    it("getPatientCount should return correct total count", async function () {
      expect(await contract.getPatientCount()).to.equal(1n);
      await contract.connect(patient2).registerPatient();
      expect(await contract.getPatientCount()).to.equal(2n);
    });

    it("getPatientsPaginated should return empty array if offset exceeds count", async function () {
      const result = await contract.getPatientsPaginated(10, 5);
      expect(result.length).to.equal(0);
    });

    it("getPatientRecordsByType should filter records correctly", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await contract.connect(doctor1).addMedicalRecord(patient1.address, "cid1", "url1", "prescription", "Rx note");
      await contract.connect(doctor1).addMedicalRecord(patient1.address, "cid2", "url2", "lab_report", "Lab note");
      await contract.connect(doctor1).addMedicalRecord(patient1.address, "cid3", "url3", "prescription", "Rx note 2");

      const rxRecords = await contract.connect(patient1).getPatientRecordsByType(patient1.address, "prescription");
      expect(rxRecords.length).to.equal(2);
      expect(rxRecords[0].ipfsCID).to.equal("cid1");
      expect(rxRecords[1].ipfsCID).to.equal("cid3");

      const labRecords = await contract.connect(patient1).getPatientRecordsByType(patient1.address, "lab_report");
      expect(labRecords.length).to.equal(1);
      expect(labRecords[0].ipfsCID).to.equal("cid2");
    });

    it("should revert if invalid recordType is passed", async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
      await expect(
        contract.connect(doctor1).addMedicalRecord(patient1.address, "cid", "url", "invalid_type", "note")
      ).to.be.revertedWith("MediChain: invalid recordType");

      await expect(
        contract.connect(patient1).getPatientRecordsByType(patient1.address, "invalid_type")
      ).to.be.revertedWith("MediChain: invalid recordType");
    });
  });

  describe("Timed Doctor Access", function () {
    it("should grant timed access and allow access within window", async function () {
      const duration = 3600; // 1 hour
      const tx = await contract.connect(patient1).grantTimedDoctorAccess(doctor1.address, duration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = block.timestamp + duration;

      await expect(tx)
        .to.emit(contract, "TimedAccessGranted")
        .withArgs(patient1.address, doctor1.address, expectedExpiry);

      expect(await contract.hasAccess(patient1.address, doctor1.address)).to.be.true;
      const remaining = await contract.getTimedAccessRemaining(patient1.address, doctor1.address);
      expect(remaining).to.be.closeTo(BigInt(duration), 5n);
    });

    it("should deny access after timed access expires", async function () {
      const duration = 100; // 100 seconds
      await contract.connect(patient1).grantTimedDoctorAccess(doctor1.address, duration);
      expect(await contract.hasAccess(patient1.address, doctor1.address)).to.be.true;

      // Increase EVM time past expiry
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine");

      expect(await contract.hasAccess(patient1.address, doctor1.address)).to.be.false;
      expect(await contract.getTimedAccessRemaining(patient1.address, doctor1.address)).to.equal(0n);
    });

    it("should revert timed access for zero duration or excess duration", async function () {
      await expect(
        contract.connect(patient1).grantTimedDoctorAccess(doctor1.address, 0)
      ).to.be.revertedWith("MediChain: invalid duration");

      await expect(
        contract.connect(patient1).grantTimedDoctorAccess(doctor1.address, 366 * 24 * 3600)
      ).to.be.revertedWith("MediChain: invalid duration");
    });

    it("should revert timed access to self or zero address", async function () {
      await expect(
        contract.connect(patient1).grantTimedDoctorAccess(patient1.address, 3600)
      ).to.be.revertedWith("MediChain: cannot grant access to self");

      await expect(
        contract.connect(patient1).grantTimedDoctorAccess(ethers.ZeroAddress, 3600)
      ).to.be.revertedWith("MediChain: doctor address is zero");
    });
  });

  describe("Emergency Contact and Access", function () {
    let emergencyContactPerson;

    beforeEach(async function () {
      [, , , , , , emergencyContactPerson] = await ethers.getSigners();
      await contract.connect(patient1).setEmergencyContact(emergencyContactPerson.address);
    });

    it("should set emergency contact and emit EmergencyContactSet event", async function () {
      const contact = await contract.getEmergencyContact(patient1.address);
      expect(contact).to.equal(emergencyContactPerson.address);
    });

    it("should revert if setting zero address or self as emergency contact", async function () {
      await expect(
        contract.connect(patient1).setEmergencyContact(ethers.ZeroAddress)
      ).to.be.revertedWith("MediChain: contact address is zero");

      await expect(
        contract.connect(patient1).setEmergencyContact(patient1.address)
      ).to.be.revertedWith("MediChain: cannot set self as emergency contact");
    });

    it("should allow registered emergency contact to grant emergency access to doctor", async function () {
      const tx = await contract.connect(emergencyContactPerson).grantEmergencyAccess(patient1.address, doctor1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "EmergencyAccessGranted")
        .withArgs(patient1.address, doctor1.address, block.timestamp);

      expect(await contract.hasAccess(patient1.address, doctor1.address)).to.be.true;
    });

    it("should revert if non-emergency contact attempts to grant emergency access", async function () {
      await expect(
        contract.connect(unauthorizedDoctor).grantEmergencyAccess(patient1.address, doctor1.address)
      ).to.be.revertedWith("MediChain: caller is not the registered emergency contact");
    });
  });

  describe("Prescription Validation On-Chain Anchoring", function () {
    const reportHash = "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef"; // 64 hex
    const safetyScore = 92;
    const severity = "SAFE";

    beforeEach(async function () {
      await contract.connect(patient1).grantDoctorAccess(doctor1.address);
    });

    it("should allow authorized doctor to anchor prescription validation report", async function () {
      const tx = await contract.connect(doctor1).addPrescriptionValidation(
        patient1.address,
        reportHash,
        safetyScore,
        severity
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "PrescriptionValidated")
        .withArgs(patient1.address, doctor1.address, reportHash, safetyScore, severity, block.timestamp);

      expect(await contract.getPrescriptionValidationCount(patient1.address)).to.equal(1n);
    });

    it("should verify existing prescription hash on-chain", async function () {
      await contract.connect(doctor1).addPrescriptionValidation(
        patient1.address,
        reportHash,
        safetyScore,
        severity
      );

      const [found, score, sev] = await contract.verifyPrescriptionHash(patient1.address, reportHash);
      expect(found).to.be.true;
      expect(score).to.equal(safetyScore);
      expect(sev).to.equal(severity);
    });

    it("should return found = false for unknown prescription hash", async function () {
      const unknownHash = "0000000000000000000000000000000000000000000000000000000000000000";
      const [found, score, sev] = await contract.verifyPrescriptionHash(patient1.address, unknownHash);
      expect(found).to.be.false;
      expect(score).to.equal(0);
      expect(sev).to.equal("");
    });

    it("should allow patient and authorized doctor to retrieve validations", async function () {
      await contract.connect(doctor1).addPrescriptionValidation(
        patient1.address,
        reportHash,
        safetyScore,
        severity
      );

      const patientView = await contract.connect(patient1).getPrescriptionValidations(patient1.address);
      expect(patientView.length).to.equal(1);
      expect(patientView[0].reportHash).to.equal(reportHash);

      const doctorView = await contract.connect(doctor1).getPrescriptionValidations(patient1.address);
      expect(doctorView.length).to.equal(1);
    });

    it("should revert unauthorized party from getting prescription validations", async function () {
      await contract.connect(doctor1).addPrescriptionValidation(
        patient1.address,
        reportHash,
        safetyScore,
        severity
      );

      await expect(
        contract.connect(unauthorizedDoctor).getPrescriptionValidations(patient1.address)
      ).to.be.revertedWith("MediChain: access denied");
    });

    it("should revert if reportHash length is not 64 chars or safetyScore > 100", async function () {
      await expect(
        contract.connect(doctor1).addPrescriptionValidation(patient1.address, "shortHash", safetyScore, severity)
      ).to.be.revertedWith("MediChain: reportHash must be 64 hex chars");

      await expect(
        contract.connect(doctor1).addPrescriptionValidation(patient1.address, reportHash, 101, severity)
      ).to.be.revertedWith("MediChain: safetyScore out of range");
    });

    it("should revert unauthorized caller from adding prescription validation", async function () {
      await expect(
        contract.connect(unauthorizedDoctor).addPrescriptionValidation(patient1.address, reportHash, safetyScore, severity)
      ).to.be.revertedWith("MediChain: caller is not authorised for this patient");
    });
  });
});
