// frontend/src/hooks/useContractEvents.js
// Custom hook to subscribe to MediChain smart contract events in real-time

import { useState, useEffect, useCallback } from 'react';

/**
 * useContractEvents Hook
 * Subscribes to blockchain events for a specific patient.
 * 
 * @param {ethers.Contract} contract - The MediChain contract instance
 * @param {string} patientAddress - The wallet address of the patient
 */
const useContractEvents = (contract, patientAddress) => {
  const [records, setRecords] = useState([]);
  const [accessGrants, setAccessGrants] = useState([]);
  const [accessRevokes, setAccessRevokes] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);

  const fetchHistoricalEvents = useCallback(async () => {
    if (!contract || !patientAddress) return;

    try {
      // 1. Fetch historical RecordAdded events
      const recordFilter = contract.filters.RecordAdded(patientAddress);
      const recordEvents = await contract.queryFilter(recordFilter, 0, "latest");
      setRecords(recordEvents.map(e => ({
        patient: e.args[0],
        doctor: e.args[1],
        cid: e.args[2],
        type: e.args[3],
        timestamp: Number(e.args[4]),
        hash: e.transactionHash
      })));

      // 2. Fetch historical DoctorAccessGranted events
      const grantFilter = contract.filters.DoctorAccessGranted(patientAddress);
      const grantEvents = await contract.queryFilter(grantFilter, 0, "latest");
      setAccessGrants(grantEvents.map(e => ({
        patient: e.args[0],
        doctor: e.args[1],
        timestamp: Number(e.args[2]),
        hash: e.transactionHash
      })));

      // 3. Fetch historical DoctorAccessRevoked events
      const revokeFilter = contract.filters.DoctorAccessRevoked(patientAddress);
      const revokeEvents = await contract.queryFilter(revokeFilter, 0, "latest");
      setAccessRevokes(revokeEvents.map(e => ({
        patient: e.args[0],
        doctor: e.args[1],
        timestamp: Number(e.args[2]),
        hash: e.transactionHash
      })));

    } catch (err) {
      console.error("Failed to fetch historical events:", err);
    }
  }, [contract, patientAddress]);

  useEffect(() => {
    if (!contract || !patientAddress) return;

    // Initial fetch
    fetchHistoricalEvents();

    // --- Set up Real-Time Listeners ---

    // 1. New Record Added
    const recordFilter = contract.filters.RecordAdded(patientAddress);
    const onRecordAdded = (patient, doctor, cid, type, timestamp, event) => {
      const newRecord = { 
        patient, 
        doctor, 
        cid, 
        type, 
        timestamp: Number(timestamp), 
        hash: event.log.transactionHash 
      };
      setRecords(prev => [newRecord, ...prev]);
      setLatestEvent({ type: 'RecordAdded', data: newRecord });
    };

    // 2. Access Granted
    const grantFilter = contract.filters.DoctorAccessGranted(patientAddress);
    const onAccessGranted = (patient, doctor, timestamp, event) => {
      const newGrant = { 
        patient, 
        doctor, 
        timestamp: Number(timestamp), 
        hash: event.log.transactionHash 
      };
      setAccessGrants(prev => [newGrant, ...prev]);
      setLatestEvent({ type: 'DoctorAccessGranted', data: newGrant });
    };

    // 3. Access Revoked
    const revokeFilter = contract.filters.DoctorAccessRevoked(patientAddress);
    const onAccessRevoked = (patient, doctor, timestamp, event) => {
      const newRevoke = { 
        patient, 
        doctor, 
        timestamp: Number(timestamp), 
        hash: event.log.transactionHash 
      };
      setAccessRevokes(prev => [newRevoke, ...prev]);
      setLatestEvent({ type: 'DoctorAccessRevoked', data: newRevoke });
    };

    // Subscribe
    contract.on(recordFilter, onRecordAdded);
    contract.on(grantFilter, onAccessGranted);
    contract.on(revokeFilter, onAccessRevoked);

    // Cleanup
    return () => {
      contract.off(recordFilter, onRecordAdded);
      contract.off(grantFilter, onAccessGranted);
      contract.off(revokeFilter, onAccessRevoked);
    };
  }, [contract, patientAddress, fetchHistoricalEvents]);

  return { records, accessGrants, accessRevokes, latestEvent };
};

export default useContractEvents;
