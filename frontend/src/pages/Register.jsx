// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\pages\Register.jsx
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity, User, Stethoscope, Building2,
  ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';

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
  };

  // Validate common fields before moving to step 3
  const handleNextToStep3 = (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);

    if (!fullName || !email || !password || !confirmPassword) {
      return setError('All common fields are required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError('Please enter a valid email address.');
    }

    if (!passwordValid) {
      setShowPasswordHints(true);
      return setError('Your password does not meet all the requirements listed below.');
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

    let userData = { role, name: fullName, email, password };

    // Role specific validation and data aggregation
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
    <div className="min-h-screen bg-hc-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl hc-card p-6 sm:p-10 shadow-hc-card-lg my-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-hc-border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-hc-blue rounded-xl flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-hc-text">Join MediChain</h1>
              <p className="text-xs text-hc-text-muted mt-0.5">Create your secure healthcare platform identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hc-badge hc-badge-primary text-xs font-semibold px-3 py-1">
              Step {step} of 3
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-hc-danger-soft border border-hc-danger/20 rounded-xl text-hc-danger text-sm">
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
          <div className="mb-6 p-4 bg-hc-success-soft border border-hc-success/20 rounded-xl text-hc-success text-sm flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <p className="text-sm font-semibold text-hc-text mb-4 text-center">Select your account type to proceed</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
              <button 
                onClick={() => handleRoleSelect('patient')} 
                className="hc-card-hover p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-blue"
              >
                <div className="w-14 h-14 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Patient</span>
                <span className="text-xs text-hc-text-muted mt-2 leading-relaxed">Manage your personal records and sovereign access controls</span>
              </button>
              
              <button 
                onClick={() => handleRoleSelect('doctor')} 
                className="hc-card-hover p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-teal"
              >
                <div className="w-14 h-14 rounded-2xl bg-hc-teal-soft text-hc-teal flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Doctor</span>
                <span className="text-xs text-hc-text-muted mt-2 leading-relaxed">Review records, prescribe medications with AI safety checks</span>
              </button>
              
              <button 
                onClick={() => handleRoleSelect('hospital')} 
                className="hc-card-hover p-6 flex flex-col items-center text-center group border border-hc-border hover:border-hc-violet"
              >
                <div className="w-14 h-14 rounded-2xl bg-hc-violet-soft text-hc-violet flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Building2 className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-hc-text">Hospital / Lab</span>
                <span className="text-xs text-hc-text-muted mt-2 leading-relaxed">Anchor authentic diagnostic test reports on decentralized storage</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Common Fields */}
        {step === 2 && (
          <form onSubmit={handleNextToStep3} className="space-y-5">
            <h2 className="text-base font-bold text-hc-text mb-4 pb-2 border-b border-hc-border-light">Account Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="hc-label">Full Name</label>
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
                <label className="hc-label">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="hc-input" 
                  placeholder="name@example.com" 
                  required 
                />
              </div>
              <div className="md:col-span-2">
                <label className="hc-label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setShowPasswordHints(true); }}
                    onFocus={() => setShowPasswordHints(true)}
                    className="hc-input pr-10"
                    placeholder="At least 8 characters with numbers & symbols"
                    required
                    minLength="8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-3 flex items-center text-hc-text-light hover:text-hc-text-muted"
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
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="hc-label">Confirm Password</label>
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
            
            <div className="flex justify-between mt-8 pt-4 border-t border-hc-border-light">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="hc-btn hc-btn-ghost hc-btn-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button 
                type="submit" 
                className="hc-btn hc-btn-primary hc-btn-sm flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Role Specific Fields */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <h2 className="text-base font-bold text-hc-text mb-4 pb-2 border-b border-hc-border-light capitalize">
              {role} Information
            </h2>
            
            {/* Patient Fields */}
            {role === 'patient' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="hc-label">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    className="hc-input" 
                    required 
                  />
                </div>
                <div>
                  <label className="hc-label">Blood Group</label>
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
                <div className="md:col-span-2">
                  <label className="hc-label">Allergies (Press Enter to add)</label>
                  <div className="hc-input min-h-[52px] flex flex-wrap gap-2 items-center p-2">
                    {allergies.map((allergy, idx) => (
                      <span key={idx} className="hc-badge hc-badge-warning flex items-center gap-1.5">
                        {allergy}
                        <button type="button" onClick={() => removeAllergy(allergy)} className="text-hc-warning hover:text-hc-danger font-bold">
                          ×
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={allergyInput} 
                      onChange={(e) => setAllergyInput(e.target.value)} 
                      onKeyDown={handleAddAllergy} 
                      className="bg-transparent outline-none flex-grow text-hc-text text-sm py-1 min-w-[150px] placeholder:text-hc-text-light" 
                      placeholder={allergies.length === 0 ? "e.g. Penicillin, Peanuts" : ""} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Fields */}
            {role === 'doctor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="hc-label">Medical Specialization</label>
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
                  <label className="hc-label">Primary Hospital / Clinic Name</label>
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
                  <label className="hc-label">Medical License Number</label>
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
                  <label className="hc-label">Years of Clinical Experience</label>
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
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="hc-label">Hospital / Diagnostic Facility Name</label>
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
                  <label className="hc-label">Location / Address</label>
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
                  <label className="hc-label">Healthcare Registration Number</label>
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

            <div className="flex justify-between mt-8 pt-4 border-t border-hc-border-light">
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="hc-btn hc-btn-ghost hc-btn-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading || successMsg !== ''} 
                className="hc-btn hc-btn-primary hc-btn-sm flex items-center justify-center min-w-[140px]"
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

        <div className="mt-8 pt-6 border-t border-hc-border-light text-center">
          <p className="text-xs text-hc-text-muted">
            Already have a MediChain account?{' '}
            <Link to="/login" className="text-hc-blue hover:text-hc-blue-hover font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

