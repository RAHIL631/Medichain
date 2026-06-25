// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\pages\Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  
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
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

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
    
    if (!fullName || !email || !password || !confirmPassword) {
      return setError('All common fields are required.');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError('Please enter a valid email address.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    
    setStep(3);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
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
      userData = { ...userData, specialization, hospitalName: hospitalNameDoc, licenseNumber, experience };
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
      // Extract the actual error message sent by the backend
      const backendError = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      setError(backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="w-full max-w-3xl bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 p-8 relative z-10 my-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Join MediChain
            </h1>
            <p className="text-gray-400 text-sm mt-1">Create your secure blockchain identity</p>
          </div>
          <span className="text-sm text-blue-300 bg-blue-900/40 border border-blue-800 px-4 py-1.5 rounded-full font-medium shadow-sm">
            Step {step} of 3
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <button 
              onClick={() => handleRoleSelect('patient')} 
              className="flex flex-col items-center p-8 bg-gray-900/50 hover:bg-blue-900/20 border-2 border-gray-700 hover:border-blue-500 rounded-xl transition-all group"
            >
              <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-semibold text-xl text-white">Patient</span>
              <span className="text-sm text-gray-400 mt-2 text-center">Manage your health records securely on-chain</span>
            </button>
            
            <button 
              onClick={() => handleRoleSelect('doctor')} 
              className="flex flex-col items-center p-8 bg-gray-900/50 hover:bg-green-900/20 border-2 border-gray-700 hover:border-green-500 rounded-xl transition-all group"
            >
              <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="font-semibold text-xl text-white">Doctor</span>
              <span className="text-sm text-gray-400 mt-2 text-center">Access patient records and prescribe medication</span>
            </button>
            
            <button 
              onClick={() => handleRoleSelect('hospital')} 
              className="flex flex-col items-center p-8 bg-gray-900/50 hover:bg-purple-900/20 border-2 border-gray-700 hover:border-purple-500 rounded-xl transition-all group"
            >
              <div className="w-16 h-16 bg-purple-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="font-semibold text-xl text-white">Hospital / Lab</span>
              <span className="text-sm text-gray-400 mt-2 text-center">Upload authentic test reports and diagnoses</span>
            </button>
          </div>
        )}

        {/* Step 2: Common Fields */}
        {step === 2 && (
          <form onSubmit={handleNextToStep3} className="space-y-5">
            <h2 className="text-xl font-medium text-white mb-4 border-b border-gray-700 pb-2">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="e.g. John Doe" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="name@example.com" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="••••••••" 
                  required 
                  minLength="6" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-8 pt-4 border-t border-gray-700">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Back
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Next Step
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Role Specific Fields */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <h2 className="text-xl font-medium text-white mb-4 border-b border-gray-700 pb-2 capitalize">
              {role} Details
            </h2>
            
            {/* Patient Fields */}
            {role === 'patient' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Blood Group</label>
                  <select 
                    value={bloodGroup} 
                    onChange={(e) => setBloodGroup(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none" 
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Allergies (Press Enter to add)</label>
                  <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 min-h-[52px] flex flex-wrap gap-2 focus-within:border-blue-500 transition-colors items-center">
                    {allergies.map((allergy, idx) => (
                      <span key={idx} className="bg-blue-900/60 border border-blue-700 text-blue-100 text-sm px-3 py-1 rounded-full flex items-center gap-2">
                        {allergy}
                        <button type="button" onClick={() => removeAllergy(allergy)} className="text-blue-400 hover:text-white transition-colors focus:outline-none">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={allergyInput} 
                      onChange={(e) => setAllergyInput(e.target.value)} 
                      onKeyDown={handleAddAllergy} 
                      className="bg-transparent outline-none flex-grow text-white py-1 min-w-[150px]" 
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Specialization</label>
                  <input 
                    type="text" 
                    value={specialization} 
                    onChange={(e) => setSpecialization(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. Cardiologist" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Primary Hospital Name</label>
                  <input 
                    type="text" 
                    value={hospitalNameDoc} 
                    onChange={(e) => setHospitalNameDoc(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. City General Hospital" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Medical License Number</label>
                  <input 
                    type="text" 
                    value={licenseNumber} 
                    onChange={(e) => setLicenseNumber(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. MED-123456" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Years of Experience</label>
                  <input 
                    type="number" 
                    value={experience} 
                    onChange={(e) => setExperience(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. 5" 
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Hospital / Lab Name</label>
                  <input 
                    type="text" 
                    value={hospitalName} 
                    onChange={(e) => setHospitalName(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. City General Hospital" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. New York, NY" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Registration Number</label>
                  <input 
                    type="text" 
                    value={registrationNumber} 
                    onChange={(e) => setRegistrationNumber(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="e.g. HOSP-987654" 
                    required 
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t border-gray-700">
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading || successMsg !== ''} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-gray-400 text-sm">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
