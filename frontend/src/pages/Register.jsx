// frontend/src/pages/Register.jsx
// MediChain — Registration (Mobile-First Responsive)
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Stethoscope, Building2,
  ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import mediChainLogo from '../medichain-logo.png';

// Password rules — must mirror backend/middleware/validate.js exactly
const passwordRules = [
  { id: 'length',    label: 'At least 8 characters',               test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least one uppercase letter (A–Z)',   test: (p) => /[A-Z]/.test(p) },
  { id: 'number',    label: 'At least one number (0–9)',             test: (p) => /\d/.test(p) },
  { id: 'special',   label: 'At least one special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

const Register = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Patient Specific Fields
  const [bloodGroup, setBloodGroup] = useState('');
  const [dob, setDob] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');

  // Doctor Specific Fields
  const [specialization, setSpecialization] = useState('');
  const [hospitalNameDoc, setHospitalNameDoc] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experience, setExperience] = useState('');

  // Hospital Specific Fields
  const [hospitalName, setHospitalName] = useState('');
  const [location, setLocation] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Memoised password rule states for live checklist
  const passwordChecks = useMemo(
    () => passwordRules.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const passwordValid = passwordChecks.every((r) => r.passed);

  // Handle adding an allergy tag when pressing enter
  const handleAddAllergy = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = allergyInput.trim();
      if (val !== '' && !allergies.includes(val)) {
        setAllergies([...allergies, val]);
      }
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergyToRemove) => {
    setAllergies(allergies.filter(a => a !== allergyToRemove));
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
    setError('');
  };

  const handleNextToStep3 = (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);

    if (!fullName || !email || !password || !confirmPassword) {
      return setError('Please fill in all required credentials.');
    }

    if (!passwordValid) {
      setShowPasswordHints(true);
      return setError('Password does not meet the security requirements.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setStep(3);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);
    setLoading(true);

    let userData = {
      name: fullName,
      email,
      password,
      role
    };

    if (role === 'patient') {
      if (!bloodGroup || !dob) {
        setLoading(false);
        return setError('Blood Group and Date of Birth are required.');
      }
      userData = { ...userData, bloodGroup, dateOfBirth: dob, allergies };
    } else if (role === 'doctor') {
      if (!specialization || !hospitalNameDoc || !licenseNumber || !experience) {
        setLoading(false);
        return setError('All doctor fields are required.');
      }
      userData = { ...userData, specialization, hospitalName: hospitalNameDoc, licenseNumber, yearsExperience: Number(experience) };
    } else if (role === 'hospital') {
      if (!hospitalName || !location || !registrationNumber) {
        setLoading(false);
        return setError('All hospital fields are required.');
      }
      userData = { ...userData, hospitalName, location, registrationNumber };
    }

    try {
      await register(userData);
      setSuccessMsg('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setFieldErrors(data.errors);
        setError(data.error || 'Validation failed. Please fix the issues below.');
      } else {
        setError(data?.error || err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hc-bg flex items-center justify-center px-4 py-8 sm:px-6 lg:p-8">
      <div className="w-full max-w-3xl hc-card p-5 sm:p-8 md:p-10 shadow-hc-card-lg my-4 sm:my-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-hc-border-light">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={mediChainLogo} alt="MediChain" className="h-9 sm:h-10 w-auto object-contain" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-hc-text leading-tight">Join MediChain</h1>
              <p className="text-xs text-hc-text-muted mt-0.5">Create your secure healthcare platform identity</p>
            </div>
          </div>
          <div className="flex items-center self-start sm:self-auto">
            <span className="hc-badge hc-badge-primary text-xs font-bold px-3 py-1">
              Step {step} of 3
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 bg-hc-danger-soft border border-hc-danger/20 rounded-xl text-hc-danger text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {fieldErrors.length > 0 && (
              <ul className="mt-2 ml-7 list-disc space-y-1 text-xs">
                {fieldErrors.map((fe, i) => (
                  <li key={i}><span className="font-semibold capitalize">{fe.field}</span>: {fe.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 bg-hc-success-soft border border-hc-success/20 rounded-xl text-hc-success text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <p className="text-xs sm:text-sm font-semibold text-hc-text mb-4 text-center">Select your account type to proceed</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-2">
              <button 
                onClick={() => handleRoleSelect('patient')} 
                className="hc-card-hover p-5 sm:p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-blue"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Patient</span>
                <span className="text-xs text-hc-text-muted mt-1.5 sm:mt-2 leading-relaxed">Manage your personal records and sovereign access controls</span>
              </button>
              
              <button 
                onClick={() => handleRoleSelect('doctor')} 
                className="hc-card-hover p-5 sm:p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-teal"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-hc-teal-soft text-hc-teal flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Doctor</span>
                <span className="text-xs text-hc-text-muted mt-1.5 sm:mt-2 leading-relaxed">Review records, prescribe medications with AI safety checks</span>
              </button>
              
              <button 
                onClick={() => handleRoleSelect('hospital')} 
                className="hc-card-hover p-5 sm:p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-violet"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-hc-violet-soft text-hc-violet flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Hospital / Lab</span>
                <span className="text-xs text-hc-text-muted mt-1.5 sm:mt-2 leading-relaxed">Anchor authentic diagnostic test reports on decentralized storage</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Common Fields */}
        {step === 2 && (
          <form onSubmit={handleNextToStep3} className="space-y-4 sm:space-y-5">
            <h2 className="text-sm sm:text-base font-bold text-hc-text mb-3 sm:mb-4 pb-2 border-b border-hc-border-light">Account Credentials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="hc-label text-xs sm:text-sm">Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="hc-input" 
                  placeholder="e.g. Dr. Jane Doe" 
                  required 
                />
              </div>
              <div>
                <label className="hc-label text-xs sm:text-sm">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="hc-input" 
                  placeholder="name@example.com" 
                  inputMode="email"
                  required 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="hc-label text-xs sm:text-sm">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setShowPasswordHints(true); }}
                    onFocus={() => setShowPasswordHints(true)}
                    className="hc-input pr-11"
                    placeholder="At least 8 characters with numbers & symbols"
                    required
                    minLength="8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-hc-text-light hover:text-hc-text-muted"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showPasswordHints && (
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded-xl bg-hc-bg-alt border border-hc-border-light">
                    {passwordChecks.map((rule) => (
                      <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${rule.passed ? 'text-hc-success font-semibold' : 'text-hc-text-muted'}`}>
                        {rule.passed
                          ? <CheckCircle className="w-3.5 h-3.5 text-hc-success flex-shrink-0" />
                          : <div className="w-3.5 h-3.5 rounded-full border border-hc-border flex-shrink-0" />
                        }
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="hc-label text-xs sm:text-sm">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`hc-input ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-hc-danger focus:border-hc-danger'
                      : ''
                  }`}
                  placeholder="Re-enter password"
                  required
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs text-hc-danger font-medium">Passwords do not match</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 sm:mt-8 pt-4 border-t border-hc-border-light">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="hc-btn hc-btn-ghost w-full sm:w-auto justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button 
                type="submit" 
                className="hc-btn hc-btn-primary w-full sm:w-auto justify-center"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Role Specific Fields */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
            <h2 className="text-sm sm:text-base font-bold text-hc-text mb-3 sm:mb-4 pb-2 border-b border-hc-border-light capitalize">
              {role} Information
            </h2>
            
            {/* Patient Fields */}
            {role === 'patient' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="hc-label text-xs sm:text-sm">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    className="hc-input" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Blood Group</label>
                  <select 
                    value={bloodGroup} 
                    onChange={(e) => setBloodGroup(e.target.value)} 
                    className="hc-input" 
                    required
                  >
                    <option value="" disabled>Select Blood Group</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="hc-label text-xs sm:text-sm">Allergies (Press Enter to add)</label>
                  <div className="hc-input min-h-[52px] flex flex-wrap gap-2 items-center p-2">
                    {allergies.map((allergy, idx) => (
                      <span key={idx} className="hc-badge hc-badge-warning flex items-center gap-1.5">
                        {allergy}
                        <button type="button" onClick={() => removeAllergy(allergy)} className="text-hc-warning hover:text-hc-danger font-bold text-sm">
                          ×
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={allergyInput} 
                      onChange={(e) => setAllergyInput(e.target.value)} 
                      onKeyDown={handleAddAllergy} 
                      className="bg-transparent outline-none flex-grow text-hc-text text-sm py-1 min-w-[120px] placeholder:text-hc-text-light" 
                      placeholder={allergies.length === 0 ? "e.g. Penicillin, Peanuts" : ""} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Fields */}
            {role === 'doctor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="hc-label text-xs sm:text-sm">Medical Specialization</label>
                  <input 
                    type="text" 
                    value={specialization} 
                    onChange={(e) => setSpecialization(e.target.value)} 
                    className="hc-input" 
                    placeholder="e.g. Cardiologist" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Primary Hospital / Clinic Name</label>
                  <input 
                    type="text" 
                    value={hospitalNameDoc} 
                    onChange={(e) => setHospitalNameDoc(e.target.value)} 
                    className="hc-input" 
                    placeholder="e.g. Apollo Medical Center" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Medical License Number</label>
                  <input 
                    type="text" 
                    value={licenseNumber} 
                    onChange={(e) => setLicenseNumber(e.target.value)} 
                    className="hc-input font-mono" 
                    placeholder="e.g. MED-123456" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Years of Clinical Experience</label>
                  <input 
                    type="number" 
                    value={experience} 
                    onChange={(e) => setExperience(e.target.value)} 
                    className="hc-input" 
                    placeholder="e.g. 8" 
                    required 
                    min="0" 
                  />
                </div>
              </div>
            )}

            {/* Hospital Fields */}
            {role === 'hospital' && (
              <div className="grid grid-cols-1 gap-4 sm:gap-5">
                <div>
                  <label className="hc-label text-xs sm:text-sm">Hospital / Diagnostic Facility Name</label>
                  <input 
                    type="text" 
                    value={hospitalName} 
                    onChange={(e) => setHospitalName(e.target.value)} 
                    className="hc-input" 
                    placeholder="e.g. Metro General Hospital" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Location / Address</label>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="hc-input" 
                    placeholder="e.g. New York, NY" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label text-xs sm:text-sm">Healthcare Registration Number</label>
                  <input 
                    type="text" 
                    value={registrationNumber} 
                    onChange={(e) => setRegistrationNumber(e.target.value)} 
                    className="hc-input font-mono" 
                    placeholder="e.g. HOSP-987654" 
                    required 
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 sm:mt-8 pt-4 border-t border-hc-border-light">
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="hc-btn hc-btn-ghost w-full sm:w-auto justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading || successMsg !== ''} 
                className="hc-btn hc-btn-primary w-full sm:w-auto justify-center min-w-[160px]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account…
                  </span>
                ) : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-hc-border-light text-center">
          <p className="text-xs sm:text-sm text-hc-text-muted">
            Already have a MediChain account?{' '}
            <Link to="/login" className="text-hc-blue hover:text-hc-blue-hover font-bold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
