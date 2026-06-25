// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\components\RecordCard.jsx
import React, { useState } from 'react';

// Icon Map based on Record Type
const getTypeIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'prescription': return '💊';
    case 'lab_report': return '🧪';
    case 'xray': return '🩻';
    case 'diagnosis': return '📋';
    default: return '📁';
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const RecordCard = ({ record }) => {
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const handleCopyCID = () => {
    if (record.ipfsCID) {
      navigator.clipboard.writeText(record.ipfsCID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPending = !record.blockchainTxHash;
  const doctorName = record.doctorId?.name || 'Unknown Doctor';
  const doctorSpec = record.doctorId?.specialization || 'General';

  return (
    <div className="glass-card overflow-hidden flex flex-col group relative transition-all duration-300 hover:shadow-cyan-900/20 hover:-translate-y-1">
      {/* Accent Border Left */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-600"></div>

      <div className="p-5 pl-6 flex-grow flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl shadow-inner">
              {getTypeIcon(record.recordType)}
            </div>
            <div>
              <h3 className="font-display font-semibold text-white capitalize text-lg">
                {record.recordType?.replace('_', ' ')}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {formatDate(record.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-gray-900/50 rounded-lg p-3 mb-4 border border-gray-800">
          <p className="text-sm font-medium text-gray-200">Dr. {doctorName}</p>
          <p className="text-xs text-cyan-400">{doctorSpec}</p>
        </div>

        {/* File Details */}
        <div className="mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-300 mb-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            <span className="truncate" title={record.fileName}>{record.fileName || 'Document'}</span>
          </div>
          <div className="text-xs text-gray-500 ml-6">
            {formatBytes(record.fileSize)}
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <div className="mb-6 flex-grow">
            <p className={`text-sm text-gray-400 leading-relaxed ${!showFullNotes && 'line-clamp-2'}`}>
              <span className="text-gray-500 font-medium mr-1">Notes:</span>
              {record.notes}
            </p>
            {record.notes.length > 80 && (
              <button 
                onClick={() => setShowFullNotes(!showFullNotes)}
                className="text-xs text-cyan-500 hover:text-cyan-400 mt-1 font-medium"
              >
                {showFullNotes ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons (Footer) */}
      <div className="grid grid-cols-3 border-t border-gray-800 bg-gray-900/30">
        
        {/* View File */}
        <a 
          href={record.ipfsURL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="py-3 flex flex-col items-center justify-center gap-1 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors border-r border-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View File
        </a>

        {/* On-Chain Verify */}
        <a 
          href={isPending ? '#' : `https://sepolia.etherscan.io/tx/${record.blockchainTxHash}`}
          target={isPending ? "_self" : "_blank"}
          rel="noopener noreferrer"
          className={`py-3 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors border-r border-gray-800 ${
            isPending 
              ? 'text-yellow-500 hover:bg-gray-800 cursor-not-allowed' 
              : 'text-green-400 hover:bg-green-900/20 hover:text-green-300'
          }`}
          onClick={(e) => isPending && e.preventDefault()}
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Pending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              On-Chain ✓
            </>
          )}
        </a>

        {/* Copy CID */}
        <button 
          onClick={handleCopyCID}
          className="py-3 flex flex-col items-center justify-center gap-1 text-xs font-medium text-cyan-500 hover:bg-cyan-900/20 hover:text-cyan-400 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy CID
            </>
          )}
        </button>

      </div>
    </div>
  );
};

export default RecordCard;
