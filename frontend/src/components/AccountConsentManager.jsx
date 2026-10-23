import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, CheckCircle, Clock3, Shield, X } from 'lucide-react';

const AccountConsentManager = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/patient/access-requests');
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || 'Could not load patient access requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateConsent = async (request, action) => {
    setBusyId(request._id);
    setError('');
    try {
      await api.patch(`/patient/access-requests/${request._id}/${action}`);
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Could not update this access request.');
    } finally {
      setBusyId('');
    }
  };

  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const activeConsents = requests.filter((request) => request.status === 'active');

  return (
    <section className="hc-card p-4 sm:p-6 space-y-5" aria-labelledby="account-consent-title">
      <div>
        <h2 id="account-consent-title" className="text-base font-bold text-hc-text flex items-center gap-2">
          <Shield className="w-5 h-5 text-hc-emerald" />
          Patient account consent
        </h2>
        <p className="text-xs text-hc-text-muted mt-1">
          Review access requests without connecting a wallet. Approving lets this clinician view records and add medical records for 30 days. You can revoke access sooner.
        </p>
      </div>

      {error && (
        <p className="p-3 rounded-xl bg-hc-danger-soft border border-hc-danger/20 text-xs text-hc-danger" role="alert">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-hc-text-muted" role="status">Loading patient access requests…</p>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-hc-warning" />
              Pending requests
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-xs text-hc-text-muted">No pending clinician requests.</p>
            ) : pendingRequests.map((request) => (
              <div key={request._id} className="p-4 rounded-xl border border-hc-border-light bg-hc-bg-alt space-y-3">
                <div>
                  <p className="text-sm font-semibold text-hc-text">{request.granteeId?.name || 'Clinician account'}</p>
                  <p className="text-xs text-hc-text-muted">
                    {request.granteeId?.role || request.granteeRole}
                    {request.granteeId?.specialization ? ` · ${request.granteeId.specialization}` : ''}
                  </p>
                  <p className="text-xs text-hc-text-muted">{request.granteeId?.email || 'Account details unavailable'}</p>
                  <p className="text-[11px] text-hc-text-light mt-1">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateConsent(request, 'approve')}
                    disabled={Boolean(busyId)}
                    className="hc-btn hc-btn-primary hc-btn-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {busyId === request._id ? 'Saving…' : 'Approve for 30 days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateConsent(request, 'deny')}
                    disabled={Boolean(busyId)}
                    className="hc-btn hc-btn-secondary hc-btn-sm"
                  >
                    <X className="w-4 h-4" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-hc-border-light pt-4">
            <h3 className="text-sm font-semibold text-hc-text">Active account grants</h3>
            {activeConsents.length === 0 ? (
              <p className="text-xs text-hc-text-muted">No active account-based grants.</p>
            ) : activeConsents.map((consent) => (
              <div key={consent._id} className="p-4 rounded-xl border border-hc-border-light flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-hc-text">{consent.granteeId?.name || 'Clinician account'}</p>
                  <p className="text-xs text-hc-text-muted">
                    {consent.granteeId?.role || consent.granteeRole}
                    {consent.granteeId?.specialization ? ` · ${consent.granteeId.specialization}` : ''}
                  </p>
                  <p className="text-xs text-hc-text-muted">
                    Expires {consent.expiresAt ? new Date(consent.expiresAt).toLocaleDateString() : 'when revoked'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConsent(consent, 'revoke')}
                  disabled={Boolean(busyId)}
                  className="hc-btn hc-btn-secondary hc-btn-sm"
                >
                  {busyId === consent._id ? 'Revoking…' : 'Revoke access'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default AccountConsentManager;
