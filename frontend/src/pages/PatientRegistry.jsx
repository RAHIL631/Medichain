import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import { QrCode, ShieldCheck } from 'lucide-react';

const PatientRegistry = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: <span aria-hidden="true">⌂</span> },
    { label: 'QR Scanner', path: '/scan', icon: <QrCode /> },
  ];

  return (
    <DashboardLayout role="Doctor" navItems={navItems}>
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Patient identification</h1>
          <p className="text-text-secondary mt-2">
            MediChain does not provide a browsable directory of patient accounts.
          </p>
        </div>

        <GlassCard className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-accent-cyan flex-shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-white">Patient details require verified access</h2>
              <p className="text-sm text-text-secondary mt-1">
                Ask the patient to share their QR Health ID or Patient ID. MediChain returns clinical
                details only after the connected, verified doctor wallet has active access on the
                configured blockchain.
              </p>
            </div>
          </div>
          <FuturisticButton onClick={() => navigate('/scan')}>
            <QrCode className="w-4 h-4 mr-2" aria-hidden="true" />
            Identify a patient
          </FuturisticButton>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default PatientRegistry;
