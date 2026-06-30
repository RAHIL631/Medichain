// SPDX-License-Identifier: MIT
// File: medichain/blockchain/contracts/MediChain.sol

pragma solidity ^0.8.19;

/**
 * @title MediChain
 * @dev Core on-chain registry for a decentralised EHR system.
 *      Stores immutable references (IPFS CID + gateway URL) and enforces patient-controlled doctor access.
 */
contract MediChain {
    // ─────────────────────────────────────────────────────────────────────────
    // Data Structures
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev MedicalRecord stores pointers to an off-chain file (IPFS) plus metadata.
     *      The actual medical file is expected to be encrypted and pinned off-chain;
     *      the CID and URL provide tamper-proof addressing.
     */
    struct MedicalRecord {
        string ipfsCID;      // content identifier — tamper-proof link to IPFS file
        string ipfsURL;      // full Pinata gateway URL for convenience
        string recordType;   // "prescription" | "lab_report" | "diagnosis" | "xray" | "other"
        address uploadedBy;  // doctor or hospital wallet address
        uint256 timestamp;   // block.timestamp when added
        bool isActive;       // soft delete flag
        string notes;        // optional doctor notes
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage (Required Mappings)
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev patientAddr => list of medical records
    mapping(address => MedicalRecord[]) private patientRecords;

    /// @dev patientAddr => doctorAddr => hasAccess (patient-controlled)
    mapping(address => mapping(address => bool)) private doctorAccess;

    /// @dev patientAddr => registered flag
    mapping(address => bool) public isRegistered;

    /// @dev array of all registered patients (for admin view)
    address[] private patientList;

    // ─────────────────────────────────────────────────────────────────────────
    // Events (emit on every state change)
    // ─────────────────────────────────────────────────────────────────────────

    event PatientRegistered(address indexed patient, uint256 timestamp);
    event RecordAdded(
        address indexed patient,
        address indexed doctor,
        string ipfsCID,
        string recordType,
        uint256 timestamp
    );
    event DoctorAccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event DoctorAccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);
    event RecordDeactivated(address indexed patient, uint256 recordIndex, uint256 timestamp);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Ensures msg.sender is a registered patient.
     */
    modifier onlyRegisteredPatient() {
        require(isRegistered[msg.sender], "MediChain: caller is not a registered patient");
        _;
    }

    /**
     * @dev Ensures a patient exists (registered).
     * @param patientAddr Patient wallet address
     */
    modifier patientMustExist(address patientAddr) {
        require(patientAddr != address(0), "MediChain: patient address is zero");
        require(isRegistered[patientAddr], "MediChain: patient is not registered");
        _;
    }

    /**
     * @dev Ensures msg.sender is the patient OR an authorised doctor for the patient.
     * @param patientAddr Patient wallet address
     */
    modifier onlyAuthorizedDoctor(address patientAddr) {
        require(
            msg.sender == patientAddr || doctorAccess[patientAddr][msg.sender],
            "MediChain: caller is not authorised for this patient"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Compares record type strings by hashing (cheaper than full string compare).
     */
    function _equals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    /**
     * @dev Enforces allowed record types to keep downstream UI/backends consistent.
     */
    function _requireValidRecordType(string memory recordType) internal pure {
        require(bytes(recordType).length > 0, "MediChain: recordType is required");
        bool ok =
            _equals(recordType, "prescription") ||
            _equals(recordType, "lab_report") ||
            _equals(recordType, "diagnosis") ||
            _equals(recordType, "xray") ||
            _equals(recordType, "other");
        require(ok, "MediChain: invalid recordType");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public / External Functions (Required API)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Registers the caller (msg.sender) as a patient.
     * @dev One-time operation per address. Adds to patientList for admin enumeration.
     */
    function registerPatient() external {
        require(msg.sender != address(0), "MediChain: invalid caller");
        require(!isRegistered[msg.sender], "MediChain: patient already registered");

        isRegistered[msg.sender] = true;
        patientList.push(msg.sender);

        emit PatientRegistered(msg.sender, block.timestamp);
    }

    /**
     * @notice Adds an IPFS-backed medical record for a patient.
     * @dev Only the patient OR a doctor previously authorised by the patient can add records.
     *      Store the CID + gateway URL so off-chain systems can retrieve the encrypted file.
     * @param patientAddr Patient wallet address to attach the record to
     * @param ipfsCID IPFS content identifier (CID)
     * @param ipfsURL Full gateway URL (e.g., Pinata gateway)
     * @param recordType One of: "prescription" | "lab_report" | "diagnosis" | "xray" | "other"
     * @param notes Optional doctor notes
     */
    function addMedicalRecord(
        address patientAddr,
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

        patientRecords[patientAddr].push(
            MedicalRecord({
                ipfsCID: ipfsCID,
                ipfsURL: ipfsURL,
                recordType: recordType,
                uploadedBy: msg.sender,
                timestamp: block.timestamp,
                isActive: true,
                notes: notes
            })
        );

        emit RecordAdded(patientAddr, msg.sender, ipfsCID, recordType, block.timestamp);
    }

    /**
     * @notice Returns all medical records for a patient.
     * @dev Only the patient or an authorised doctor can read records.
     * @param patientAddr Patient wallet address
     * @return records Array of MedicalRecord structs (includes inactive records; check isActive)
     */
    function getMedicalRecords(address patientAddr)
        external
        view
        patientMustExist(patientAddr)
        onlyAuthorizedDoctor(patientAddr)
        returns (MedicalRecord[] memory records)
    {
        return patientRecords[patientAddr];
    }

    /**
     * @notice Returns total number of records for a patient.
     * @dev Public view (does not leak record content beyond count).
     * @param patientAddr Patient wallet address
     * @return count Number of records
     */
    function getRecordCount(address patientAddr)
        external
        view
        patientMustExist(patientAddr)
        returns (uint256 count)
    {
        return patientRecords[patientAddr].length;
    }

    /**
     * @notice Grants a doctor address access to the caller's (patient's) records.
     * @dev Patient-controlled access permissions on-chain.
     * @param doctorAddr Doctor/hospital wallet address to grant access to
     */
    function grantDoctorAccess(address doctorAddr) external onlyRegisteredPatient {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        require(doctorAddr != msg.sender, "MediChain: cannot grant access to self");
        require(!doctorAccess[msg.sender][doctorAddr], "MediChain: access already granted");

        doctorAccess[msg.sender][doctorAddr] = true;
        emit DoctorAccessGranted(msg.sender, doctorAddr, block.timestamp);
    }

    /**
     * @notice Revokes a doctor address access to the caller's (patient's) records.
     * @dev Patient-controlled access permissions on-chain.
     * @param doctorAddr Doctor/hospital wallet address to revoke access from
     */
    function revokeDoctorAccess(address doctorAddr) external onlyRegisteredPatient {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        require(doctorAccess[msg.sender][doctorAddr], "MediChain: access is not granted");

        doctorAccess[msg.sender][doctorAddr] = false;
        emit DoctorAccessRevoked(msg.sender, doctorAddr, block.timestamp);
    }

    /**
     * @notice Checks whether a doctor has access to a patient's records.
     * @dev Public view helper used by UI/backends.
     * @param patientAddr Patient wallet address
     * @param doctorAddr Doctor wallet address
     * @return allowed True if doctorAddr is authorised by patientAddr
     */
    function hasAccess(address patientAddr, address doctorAddr)
        external
        view
        patientMustExist(patientAddr)
        returns (bool allowed)
    {
        require(doctorAddr != address(0), "MediChain: doctor address is zero");
        return doctorAccess[patientAddr][doctorAddr];
    }

    /**
     * @notice Soft-deletes (deactivates) a record by index.
     * @dev Only the patient can deactivate their own records.
     * @param patientAddr Patient wallet address
     * @param index Index of the record in patientRecords[patientAddr]
     */
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

    /**
     * @notice Returns all registered patient addresses.
     * @dev Public view as requested. Be aware this reveals the patient set on-chain.
     * @return patients Array of registered patient wallet addresses
     */
    function getAllPatients() external view returns (address[] memory patients) {
        return patientList;
    }

    /**
     * @notice Returns patient records filtered by recordType.
     * @dev Only the patient or an authorised doctor can read records.
     *      Uses a two-pass filter to allocate a correctly-sized memory array.
     * @param patientAddr Patient wallet address
     * @param recordType Type filter: "prescription" | "lab_report" | "diagnosis" | "xray" | "other"
     * @return records Filtered array of MedicalRecord (only active records matching recordType)
     */
    function getPatientRecordsByType(address patientAddr, string calldata recordType)
        external
        view
        patientMustExist(patientAddr)
        onlyAuthorizedDoctor(patientAddr)
        returns (MedicalRecord[] memory records)
    {
        _requireValidRecordType(recordType);

        MedicalRecord[] storage all = patientRecords[patientAddr];
        uint256 len = all.length;

        uint256 matchCount = 0;
        for (uint256 i = 0; i < len; i++) {
            if (all[i].isActive && _equals(all[i].recordType, recordType)) {
                matchCount++;
            }
        }

        MedicalRecord[] memory filtered = new MedicalRecord[](matchCount);
        uint256 j = 0;
        for (uint256 i = 0; i < len; i++) {
            if (all[i].isActive && _equals(all[i].recordType, recordType)) {
                filtered[j] = all[i];
                j++;
            }
        }

        return filtered;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prescription Validation — On-Chain Hash Anchoring
    // ─────────────────────────────────────────────────────────────────────────

    struct PrescriptionValidation {
        string  reportHash;   // SHA-256 hex (64 chars)
        uint8   safetyScore;  // 0–100
        string  severity;     // SAFE / LOW / MODERATE / HIGH / CRITICAL
        uint256 timestamp;
        address validator;
    }

    mapping(address => PrescriptionValidation[]) private prescriptionValidations;

    event PrescriptionValidated(
        address indexed patient,
        address indexed validator,
        string  reportHash,
        uint8   safetyScore,
        string  severity,
        uint256 timestamp
    );

    function addPrescriptionValidation(
        address patientAddr,
        string  calldata reportHash,
        uint8   safetyScore,
        string  calldata severity
    ) external patientMustExist(patientAddr) {
        require(bytes(reportHash).length == 64, "MediChain: reportHash must be 64 hex chars");
        require(safetyScore <= 100, "MediChain: safetyScore out of range");
        require(bytes(severity).length > 0, "MediChain: severity cannot be empty");
        prescriptionValidations[patientAddr].push(PrescriptionValidation({
            reportHash:  reportHash,
            safetyScore: safetyScore,
            severity:    severity,
            timestamp:   block.timestamp,
            validator:   msg.sender
        }));
        emit PrescriptionValidated(
            patientAddr, msg.sender, reportHash, safetyScore, severity, block.timestamp
        );
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

    function getPrescriptionValidationCount(address patientAddr)
        external view returns (uint256)
    {
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

