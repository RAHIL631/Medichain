// SPDX-License-Identifier: MIT
// File: medichain/blockchain/contracts/MediChain.sol
// Version: 2.0.0 — Emergency access, time-limited grants, prescription validation

pragma solidity ^0.8.19;

/**
 * @title MediChain
 * @dev Core on-chain registry for a decentralised EHR system.
 *      Stores immutable references (IPFS CID + gateway URL) and enforces patient-controlled doctor access.
 *      v2.0: Adds emergency access, time-limited access grants, and emergency contact registry.
 */
contract MediChain {

    // ─────────────────────────────────────────────────────────────────────────
    // Data Structures
    // ─────────────────────────────────────────────────────────────────────────

    struct MedicalRecord {
        string  ipfsCID;      // content identifier — tamper-proof link to IPFS file
        string  ipfsURL;      // full Pinata gateway URL for convenience
        string  recordType;   // "prescription" | "lab_report" | "diagnosis" | "xray" | "other"
        address uploadedBy;   // doctor or hospital wallet address
        uint256 timestamp;    // block.timestamp when added
        bool    isActive;     // soft delete flag
        string  notes;        // optional doctor notes
    }

    struct TimedAccess {
        bool    granted;
        uint256 expiresAt;    // unix timestamp after which access is revoked
    }

    struct PrescriptionValidation {
        string  reportHash;   // SHA-256 hex (64 chars)
        uint8   safetyScore;  // 0–100
        string  severity;     // SAFE / LOW / MODERATE / HIGH / CRITICAL
        uint256 timestamp;
        address validator;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    mapping(address => MedicalRecord[]) private patientRecords;
    mapping(address => mapping(address => bool)) private doctorAccess;
    mapping(address => mapping(address => TimedAccess)) private timedAccess;
    mapping(address => bool) public isRegistered;
    address[] private patientList;
    mapping(address => address) private emergencyContact;
    mapping(address => PrescriptionValidation[]) private prescriptionValidations;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event PatientRegistered(address indexed patient, uint256 timestamp);
    event RecordAdded(address indexed patient, address indexed doctor, string ipfsCID, string recordType, uint256 timestamp);
    event DoctorAccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event DoctorAccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);
    event RecordDeactivated(address indexed patient, uint256 recordIndex, uint256 timestamp);
    event TimedAccessGranted(address indexed patient, address indexed doctor, uint256 expiresAt);
    event EmergencyContactSet(address indexed patient, address indexed contact, uint256 timestamp);
    event EmergencyAccessGranted(address indexed patient, address indexed requester, uint256 timestamp);
    event PrescriptionValidated(address indexed patient, address indexed validator, string reportHash, uint8 safetyScore, string severity, uint256 timestamp);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyRegisteredPatient() {
        require(isRegistered[msg.sender], "MediChain: caller is not a registered patient");
        _;
    }

    modifier patientMustExist(address patientAddr) {
        require(patientAddr != address(0), "MediChain: patient address is zero");
        require(isRegistered[patientAddr], "MediChain: patient is not registered");
        _;
    }

    modifier onlyAuthorizedDoctor(address patientAddr) {
        require(_isAuthorized(patientAddr, msg.sender), "MediChain: caller is not authorised for this patient");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _equals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _requireValidRecordType(string memory recordType) internal pure {
        require(bytes(recordType).length > 0, "MediChain: recordType is required");
        bool ok = _equals(recordType, "prescription") ||
                  _equals(recordType, "lab_report") ||
                  _equals(recordType, "diagnosis") ||
                  _equals(recordType, "xray") ||
                  _equals(recordType, "other");
        require(ok, "MediChain: invalid recordType");
    }

    function _isAuthorized(address patientAddr, address caller) internal view returns (bool) {
        if (caller == patientAddr) return true;
        if (doctorAccess[patientAddr][caller]) return true;
        TimedAccess storage ta = timedAccess[patientAddr][caller];
        if (ta.granted && block.timestamp <= ta.expiresAt) return true;
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Patient Registration
    // ─────────────────────────────────────────────────────────────────────────

    function registerPatient() external {
        require(msg.sender != address(0), "MediChain: invalid caller");
        require(!isRegistered[msg.sender], "MediChain: patient already registered");
        isRegistered[msg.sender] = true;
        patientList.push(msg.sender);
        emit PatientRegistered(msg.sender, block.timestamp);
    }

    function getAllPatients() external view returns (address[] memory) {
        return patientList;
    }

    function getPatientCount() external view returns (uint256) {
        return patientList.length;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Medical Records
    // ─────────────────────────────────────────────────────────────────────────

    function addMedicalRecord(
        address        patientAddr,
        string calldata ipfsCID,
        string calldata ipfsURL,
        string calldata recordType,
        string calldata notes
    )
        external
        patientMustExist(patientAddr)
        onlyAuthorizedDoctor(patientAddr)
    {
        require(bytes(ipfsCID).length > 0, "MediChain: ipfsCID is required");
        require(bytes(ipfsURL).length > 0, "MediChain: ipfsURL is required");
        _requireValidRecordType(recordType);

        patientRecords[patientAddr].push(MedicalRecord({
            ipfsCID:    ipfsCID,
            ipfsURL:    ipfsURL,
            recordType: recordType,
            uploadedBy: msg.sender,
            timestamp:  block.timestamp,
            isActive:   true,
            notes:      notes
        }));

        emit RecordAdded(patientAddr, msg.sender, ipfsCID, recordType, block.timestamp);
    }

    function getMedicalRecords(address patientAddr)
        external view
        patientMustExist(patientAddr)
        onlyAuthorizedDoctor(patientAddr)
        returns (MedicalRecord[] memory)
    {
        return patientRecords[patientAddr];
    }

    function getRecordCount(address patientAddr)
        external view
        patientMustExist(patientAddr)
        returns (uint256)
    {
        return patientRecords[patientAddr].length;
    }

    function getPatientRecordsByType(address patientAddr, string calldata recordType)
        external view
        patientMustExist(patientAddr)
        onlyAuthorizedDoctor(patientAddr)
        returns (MedicalRecord[] memory)
    {
        _requireValidRecordType(recordType);
        MedicalRecord[] storage all = patientRecords[patientAddr];
        uint256 len = all.length;
        uint256 matchCount = 0;
        for (uint256 i = 0; i < len; i++) {
            if (all[i].isActive && _equals(all[i].recordType, recordType)) matchCount++;
        }
        MedicalRecord[] memory filtered = new MedicalRecord[](matchCount);
        uint256 j = 0;
        for (uint256 i = 0; i < len; i++) {
            if (all[i].isActive && _equals(all[i].recordType, recordType)) {
                filtered[j++] = all[i];
            }
        }
        return filtered;
    }

    function deactivateRecord(address patientAddr, uint256 index)
        external
        patientMustExist(patientAddr)
    {
        require(msg.sender == patientAddr, "MediChain: only the patient can deactivate records");
        require(index < patientRecords[patientAddr].length, "MediChain: record index out of bounds");
        require(patientRecords[patientAddr][index].isActive, "MediChain: record already inactive");
        patientRecords[patientAddr][index].isActive = false;
        emit RecordDeactivated(patientAddr, index, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Access Control
    // ─────────────────────────────────────────────────────────────────────────

    function grantDoctorAccess(address doctorAddr) external onlyRegisteredPatient {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        require(doctorAddr != msg.sender, "MediChain: cannot grant access to self");
        require(!doctorAccess[msg.sender][doctorAddr], "MediChain: access already granted");
        doctorAccess[msg.sender][doctorAddr] = true;
        emit DoctorAccessGranted(msg.sender, doctorAddr, block.timestamp);
    }

    function grantTimedDoctorAccess(address doctorAddr, uint256 durationSeconds)
        external onlyRegisteredPatient
    {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        require(doctorAddr != msg.sender, "MediChain: cannot grant access to self");
        require(durationSeconds > 0 && durationSeconds <= 365 days, "MediChain: invalid duration");
        uint256 expiresAt = block.timestamp + durationSeconds;
        timedAccess[msg.sender][doctorAddr] = TimedAccess({ granted: true, expiresAt: expiresAt });
        emit TimedAccessGranted(msg.sender, doctorAddr, expiresAt);
    }

    function revokeDoctorAccess(address doctorAddr) external onlyRegisteredPatient {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        require(
            doctorAccess[msg.sender][doctorAddr] || timedAccess[msg.sender][doctorAddr].granted,
            "MediChain: access is not granted"
        );
        doctorAccess[msg.sender][doctorAddr] = false;
        timedAccess[msg.sender][doctorAddr]  = TimedAccess({ granted: false, expiresAt: 0 });
        emit DoctorAccessRevoked(msg.sender, doctorAddr, block.timestamp);
    }

    function hasAccess(address patientAddr, address doctorAddr)
        external view
        patientMustExist(patientAddr)
        returns (bool)
    {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        return _isAuthorized(patientAddr, doctorAddr);
    }

    function getTimedAccessRemaining(address patientAddr, address doctorAddr)
        external view returns (uint256)
    {
        TimedAccess storage ta = timedAccess[patientAddr][doctorAddr];
        if (!ta.granted || block.timestamp > ta.expiresAt) return 0;
        return ta.expiresAt - block.timestamp;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Emergency Access (NEW in v2.0)
    // ─────────────────────────────────────────────────────────────────────────

    function setEmergencyContact(address contactAddr) external onlyRegisteredPatient {
        require(contactAddr != address(0), "MediChain: contact address is zero");
        require(contactAddr != msg.sender, "MediChain: cannot set self as emergency contact");
        emergencyContact[msg.sender] = contactAddr;
        emit EmergencyContactSet(msg.sender, contactAddr, block.timestamp);
    }

    function getEmergencyContact(address patientAddr)
        external view patientMustExist(patientAddr) returns (address)
    {
        return emergencyContact[patientAddr];
    }

    function grantEmergencyAccess(address patientAddr, address doctorAddr)
        external patientMustExist(patientAddr)
    {
        require(
            emergencyContact[patientAddr] == msg.sender,
            "MediChain: caller is not the registered emergency contact"
        );
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        uint256 expiresAt = block.timestamp + 24 hours;
        timedAccess[patientAddr][doctorAddr] = TimedAccess({ granted: true, expiresAt: expiresAt });
        emit EmergencyAccessGranted(patientAddr, doctorAddr, block.timestamp);
        emit TimedAccessGranted(patientAddr, doctorAddr, expiresAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prescription Validation — On-Chain Hash Anchoring (NEW in v2.0)
    // ─────────────────────────────────────────────────────────────────────────

    function addPrescriptionValidation(
        address        patientAddr,
        string calldata reportHash,
        uint8           safetyScore,
        string calldata severity
    ) external patientMustExist(patientAddr) {
        require(bytes(reportHash).length == 64, "MediChain: reportHash must be 64 hex chars");
        require(safetyScore <= 100,             "MediChain: safetyScore out of range");
        require(bytes(severity).length > 0,     "MediChain: severity cannot be empty");
        prescriptionValidations[patientAddr].push(PrescriptionValidation({
            reportHash:  reportHash,
            safetyScore: safetyScore,
            severity:    severity,
            timestamp:   block.timestamp,
            validator:   msg.sender
        }));
        emit PrescriptionValidated(patientAddr, msg.sender, reportHash, safetyScore, severity, block.timestamp);
    }

    function getPrescriptionValidations(address patientAddr)
        external view patientMustExist(patientAddr)
        returns (PrescriptionValidation[] memory)
    {
        require(
            msg.sender == patientAddr || doctorAccess[patientAddr][msg.sender],
            "MediChain: access denied"
        );
        return prescriptionValidations[patientAddr];
    }

    function getPrescriptionValidationCount(address patientAddr) external view returns (uint256) {
        return prescriptionValidations[patientAddr].length;
    }

    function verifyPrescriptionHash(address patientAddr, string calldata reportHash)
        external view returns (bool found, uint8 score, string memory sev)
    {
        PrescriptionValidation[] storage pvs = prescriptionValidations[patientAddr];
        bytes32 target = keccak256(bytes(reportHash));
        for (uint256 i = 0; i < pvs.length; i++) {
            if (keccak256(bytes(pvs[i].reportHash)) == target) {
                return (true, pvs[i].safetyScore, pvs[i].severity);
            }
        }
        return (false, 0, "");
    }
}
