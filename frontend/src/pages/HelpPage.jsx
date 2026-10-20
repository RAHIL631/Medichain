// frontend/src/pages/HelpPage.jsx
// Concise in-app product help aligned with implemented MediChain features.
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  HelpCircle, QrCode, FileText, Lock, Wallet, Brain, Shield, ArrowRight
} from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
  <section className="hc-card p-5 sm:p-6">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 rounded-xl bg-hc-blue-soft text-hc-blue flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-base sm:text-lg font-bold text-hc-text">{title}</h2>
    </div>
    <div className="text-xs sm:text-sm text-hc-text-muted leading-relaxed space-y-2">
      {children}
    </div>
  </section>
);

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-hc-bg flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hc-blue-soft border border-hc-blue-mid text-hc-blue text-xs font-semibold mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            Product help
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-hc-text mb-2">How to use MediChain</h1>
          <p className="text-sm text-hc-text-muted leading-relaxed">
            Short guidance for features that exist in this application today.
            MetaMask is optional for ordinary sign-in.
          </p>
        </div>

        <div className="space-y-4">
          <Section icon={Lock} title="Account access">
            <p>Create an account with email and password as a patient, doctor, hospital staff, or admin.</p>
            <p>If sign-in fails, check the email/password and that the backend is reachable. Cold-started demo servers may take up to a minute on first request.</p>
            <p>
              <Link to="/login" className="text-hc-blue font-semibold hover:underline">Sign in</Link>
              {' · '}
              <Link to="/register" className="text-hc-blue font-semibold hover:underline">Create account</Link>
            </p>
          </Section>

          <Section icon={QrCode} title="QR Health ID">
            <p>Your QR code contains your patient identifier only. It does <strong className="text-hc-text">not</strong> authorize anyone to open medical records.</p>
            <p>Patients: open My Health QR from the dashboard, show or download the code, then grant access separately under Manage Access.</p>
            <p>Doctors: scan the QR to identify the patient. Records appear only if consent is already granted.</p>
          </Section>

          <Section icon={FileText} title="Medical documents">
            <p>Authorized doctors upload PDF/JPG/PNG records. Files are stored via IPFS; integrity may be anchored on Ethereum Sepolia when a wallet is connected.</p>
            <p>If upload fails, confirm patient consent, file size/type, and that storage services are available. Success is shown only after the server accepts the upload.</p>
          </Section>

          <Section icon={Shield} title="Permissions (grant & revoke)">
            <p>Patients control who can view their records. Granting access authorizes a doctor; revoking removes that authorization for subsequent requests.</p>
            <p>On-chain consent signing needs MetaMask on Sepolia. App login itself does not require a wallet.</p>
          </Section>

          <Section icon={Wallet} title="Wallet & network">
            <p>Connect MetaMask only when you need on-chain consent or record anchoring.</p>
            <p>Select the Ethereum Sepolia test network (chain ID 11155111). Wrong network or rejected signatures will show a failure state — retry after correcting the network.</p>
          </Section>

          <Section icon={Brain} title="AI results">
            <p>Drug-interaction and health insights are advisory clinical decision support. They are not diagnoses and do not replace licensed clinical judgment.</p>
            <p>If the AI service is unavailable, the doctor workflow will ask you to retry the check before uploading when medications are listed.</p>
          </Section>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link to="/" className="hc-btn hc-btn-ghost justify-center">
            Back to home
          </Link>
          <Link to="/register" className="hc-btn hc-btn-primary justify-center">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
