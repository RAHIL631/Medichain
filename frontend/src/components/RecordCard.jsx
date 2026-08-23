// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\components\RecordCard.jsx
import React, { useState } from 'react';
import { getRecordTypeImage } from '../utils/images';
import {
  ExternalLink, CheckCircle, Copy, Check,
  Clock, User, Paperclip
} from 'lucide-react';

// Icon Map based on Record Type
const getTypeIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'prescription': return '💊';
    case 'lab_report':   return '🧪';
    case 'lab-report':   return '🧪';
    case 'xray':         return '🩻';
    case 'imaging':      return '🩻';
    case 'diagnosis':    return '📋';
    case 'vaccination':  return '💉';
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
  const doctorName = record.doctorId?.name || record.doctor || 'Healthcare Provider';
  const doctorSpec = record.doctorId?.specialization || 'Clinical';
  const thumbUrl = getRecordTypeImage(record.recordType || record.type || '');
  const recordTypeLabel = (record.recordType || 'Medical Record').replace(/[_-]/g, ' ');

  return (
    <div className="hc-card overflow-hidden flex flex-col group relative transition-all duration-200 hover:shadow-hc-card-md">
      {/* Real thumbnail image banner */}
      <div className="relative w-full h-28 overflow-hidden flex-shrink-0 bg-hc-bg-alt">
        <img
          src={thumbUrl}
          alt={recordTypeLabel}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2.5 left-4 flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(record.recordType)}</span>
          <span className="text-xs font-bold text-white capitalize drop-shadow-sm">
            {recordTypeLabel}
          </span>
        </div>
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-hc-blue" />
          <span className="text-[10px] text-hc-text font-mono font-semibold">IPFS</span>
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        {/* Header & Date */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-hc-text capitalize text-base leading-snug">
              {record.description || recordTypeLabel}
            </h3>
            <p className="text-xs text-hc-text-muted flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-hc-text-light" />
              {formatDate(record.createdAt || record.timestamp)}
            </p>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-hc-bg-alt rounded-xl p-3 mb-3.5 border border-hc-border-light flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-hc-blue-soft text-hc-blue flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-hc-text truncate">Dr. {doctorName}</p>
            <p className="text-[11px] text-hc-text-muted truncate">{doctorSpec}</p>
          </div>
        </div>

        {/* File Details */}
        <div className="mb-3.5 text-xs text-hc-text-muted flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
            <Paperclip className="w-3.5 h-3.5 text-hc-text-light flex-shrink-0" />
            <span className="truncate font-medium text-hc-text" title={record.fileName}>{record.fileName || 'Attached Document'}</span>
          </div>
          {record.fileSize && (
            <span className="text-[11px] text-hc-text-light flex-shrink-0 font-mono">
              {formatBytes(record.fileSize)}
            </span>
          )}
        </div>

        {/* Notes */}
        {record.notes && (
          <div className="mb-4 flex-grow text-xs">
            <p className={`text-hc-text-muted leading-relaxed ${!showFullNotes && 'line-clamp-2'}`}>
              <span className="font-semibold text-hc-text mr-1">Notes:</span>
              {record.notes}
            </p>
            {record.notes.length > 80 && (
              <button 
                onClick={() => setShowFullNotes(!showFullNotes)}
                className="text-xs text-hc-blue hover:underline mt-1 font-semibold"
              >
                {showFullNotes ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="grid grid-cols-3 border-t border-hc-border-light bg-hc-bg-alt/50 divide-x divide-hc-border-light text-xs font-semibold">
        {/* View File */}
        <a 
          href={record.ipfsURL || `https://gateway.pinata.cloud/ipfs/${record.ipfsCID}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="py-2.5 flex items-center justify-center gap-1.5 text-hc-text-muted hover:text-hc-blue hover:bg-hc-bg-alt transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>

        {/* On-Chain Verify */}
        {isPending ? (
          <span className="py-2.5 flex items-center justify-center gap-1 text-hc-warning">
            <span className="w-3 h-3 border-2 border-hc-warning border-t-transparent rounded-full animate-spin" />
            Pending
          </span>
        ) : (
          <a 
            href={`https://sepolia.etherscan.io/tx/${record.blockchainTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 flex items-center justify-center gap-1 text-hc-success hover:bg-hc-success-soft transition-colors"
            title="View Sepolia transaction"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Verified
          </a>
        )}

        {/* Copy CID */}
        <button 
          onClick={handleCopyCID}
          className="py-2.5 flex items-center justify-center gap-1 text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-colors"
          title="Copy IPFS CID"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-hc-success" />
              <span className="text-hc-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy CID
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RecordCard;
