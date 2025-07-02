import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Authentication state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    institution_name: '',
    specialization: '',
    bio: ''
  });

  // App state
  const [requests, setRequests] = useState([]);
  const [myInterests, setMyInterests] = useState([]);
  const [filters, setFilters] = useState({
    surgery_type: '',
    specialization: '',
    urgency: ''
  });

  // Request form state
  const [requestForm, setRequestForm] = useState({
    surgery_type: '',
    required_specialization: '',
    urgency: 'Medium',
    date: '',
    location: '',
    hospital_name: '',
    condition_description: ''
  });

  const [editingRequest, setEditingRequest] = useState(null);

  // Check authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setCurrentView(user.role === 'hospital' ? 'hospital-dashboard' : 'doctor-dashboard');
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }
    }
    
    setLoading(false);
  }, []);

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  // Authentication functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });
      
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      setCurrentUser(response.user);
      setCurrentView(response.user.role === 'hospital' ? 'hospital-dashboard' : 'doctor-dashboard');
      setLoginData({ email: '', password: '' });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData)
      });
      
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      setCurrentUser(response.user);
      setCurrentView(response.user.role === 'hospital' ? 'hospital-dashboard' : 'doctor-dashboard');
      setSignupData({
        name: '',
        email: '',
        password: '',
        role: 'doctor',
        institution_name: '',
        specialization: '',
        bio: ''
      });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setCurrentUser(null);
    setCurrentView('login');
    setRequests([]);
    setMyInterests([]);
  };

  // Data fetching functions
  const fetchRequests = async () => {
    try {
      const data = await apiCall('/api/requests');
      setRequests(data);
    } catch (error) {
      setError('Failed to fetch requests');
    }
  };

  const fetchMyInterests = async () => {
    try {
      const data = await apiCall('/api/interests/me');
      setMyInterests(data);
    } catch (error) {
      setError('Failed to fetch interests');
    }
  };

  // Load data when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchRequests();
      if (currentUser.role === 'doctor') {
        fetchMyInterests();
      }
    }
  }, [currentUser]);

  // Request management functions
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await apiCall('/api/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm)
      });
      
      console.log('Request created successfully:', response);
      
      // Reset form
      setRequestForm({
        surgery_type: '',
        required_specialization: '',
        urgency: 'Medium',
        date: '',
        location: '',
        hospital_name: '',
        condition_description: ''
      });
      
      // Refresh requests and redirect
      await fetchRequests();
      setCurrentView('hospital-dashboard');
      
      // Show success message
      alert('Surgery request created successfully!');
    } catch (error) {
      console.error('Error creating request:', error);
      setError(error.message);
    }
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await apiCall(`/api/requests/${editingRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify(requestForm)
      });
      
      setEditingRequest(null);
      setRequestForm({
        surgery_type: '',
        required_specialization: '',
        urgency: 'Medium',
        date: '',
        location: '',
        hospital_name: '',
        condition_description: ''
      });
      
      await fetchRequests();
      setCurrentView('hospital-dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    try {
      await apiCall(`/api/requests/${requestId}`, { method: 'DELETE' });
      await fetchRequests();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleExpressInterest = async (requestId) => {
    try {
      await apiCall('/api/interests', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId })
      });
      
      await fetchRequests();
      await fetchMyInterests();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleWithdrawInterest = async (requestId) => {
    try {
      await apiCall(`/api/interests/${requestId}`, { method: 'DELETE' });
      await fetchRequests();
      await fetchMyInterests();
    } catch (error) {
      setError(error.message);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    return (
      (!filters.surgery_type || request.surgery_type.toLowerCase().includes(filters.surgery_type.toLowerCase())) &&
      (!filters.specialization || request.required_specialization.toLowerCase().includes(filters.specialization.toLowerCase())) &&
      (!filters.urgency || request.urgency === filters.urgency)
    );
  });

  // Check if doctor has expressed interest
  const hasExpressedInterest = (requestId) => {
    return myInterests.some(interest => interest.interest.request_id === requestId);
  };

  const startEditRequest = (request) => {
    setEditingRequest(request);
    setRequestForm({
      surgery_type: request.surgery_type,
      required_specialization: request.required_specialization,
      urgency: request.urgency,
      date: request.date,
      location: request.location,
      hospital_name: request.hospital_name,
      condition_description: request.condition_description || ''
    });
    setCurrentView('create-request');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      {currentUser && (
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">Medexus</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {currentUser.role === 'hospital' ? (
                  <>
                    <button
                      onClick={() => setCurrentView('hospital-dashboard')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'hospital-dashboard' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      My Requests
                    </button>
                    <button
                      onClick={() => setCurrentView('create-request')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'create-request' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Create Request
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCurrentView('doctor-dashboard')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'doctor-dashboard' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Browse Requests
                    </button>
                    <button
                      onClick={() => setCurrentView('my-interests')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'my-interests' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      My Interests
                    </button>
                  </>
                )}
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {currentUser.name} ({currentUser.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'login' && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Login to Medexus</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Login
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setCurrentView('signup')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Don't have an account? Sign up
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-100 rounded-md">
              <h3 className="font-semibold text-sm mb-2">Test Accounts:</h3>
              <div className="text-xs space-y-1">
                <div><strong>Hospital:</strong> admin@cityhospital.com / hospital123</div>
                <div><strong>Doctor:</strong> james.wilson@medexus.com / doctor123</div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'signup' && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign Up for Medexus</h2>
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={signupData.role}
                  onChange={(e) => setSignupData({ ...signupData, role: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="doctor">Doctor</option>
                  <option value="hospital">Hospital</option>
                </select>
              </div>
              
              {signupData.role === 'hospital' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                  <input
                    type="text"
                    required
                    value={signupData.institution_name}
                    onChange={(e) => setSignupData({ ...signupData, institution_name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              {signupData.role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Specialization</label>
                    <input
                      type="text"
                      required
                      value={signupData.specialization}
                      onChange={(e) => setSignupData({ ...signupData, specialization: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      value={signupData.bio}
                      onChange={(e) => setSignupData({ ...signupData, bio: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Sign Up
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setCurrentView('login')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Already have an account? Login
              </button>
            </div>
          </div>
        )}

        {currentView === 'hospital-dashboard' && currentUser?.role === 'hospital' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Surgery Requests</h1>
              <button
                onClick={() => setCurrentView('create-request')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
              >
                + New Request
              </button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{request.surgery_type}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.urgency === 'High' ? 'bg-red-100 text-red-800' :
                      request.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.urgency}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Specialization:</strong> {request.required_specialization}</p>
                    <p><strong>Date:</strong> {new Date(request.date).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> {request.location}</p>
                    {request.condition_description && (
                      <p><strong>Description:</strong> {request.condition_description}</p>
                    )}
                  </div>
                  
                  {request.interested_doctors && request.interested_doctors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Interested Doctors ({request.interested_doctors.length})</h4>
                      <div className="space-y-2">
                        {request.interested_doctors.map((doctor) => (
                          <div key={doctor.id} className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{doctor.name}</p>
                                <p className="text-sm text-gray-600">{doctor.specialization}</p>
                                {doctor.bio && <p className="text-xs text-gray-500 mt-1">{doctor.bio}</p>}
                              </div>
                              <a
                                href={`mailto:${doctor.email}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Contact
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => startEditRequest(request)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRequest(request.id)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {requests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No surgery requests yet</div>
                <button
                  onClick={() => setCurrentView('create-request')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Create Your First Request
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === 'create-request' && currentUser?.role === 'hospital' && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingRequest ? 'Edit Surgery Request' : 'Create Surgery Request'}
            </h2>
            
            <form onSubmit={editingRequest ? handleUpdateRequest : handleCreateRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Surgery Type</label>
                  <input
                    type="text"
                    required
                    value={requestForm.surgery_type}
                    onChange={(e) => setRequestForm({ ...requestForm, surgery_type: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Hip Replacement"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Specialization</label>
                  <input
                    type="text"
                    required
                    value={requestForm.required_specialization}
                    onChange={(e) => setRequestForm({ ...requestForm, required_specialization: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Orthopedic Surgeon"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Urgency</label>
                  <select
                    value={requestForm.urgency}
                    onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    value={requestForm.date}
                    onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    required
                    value={requestForm.location}
                    onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City, State"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={requestForm.hospital_name}
                    onChange={(e) => setRequestForm({ ...requestForm, hospital_name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Hospital Name"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Condition Description (Optional)</label>
                <textarea
                  value={requestForm.condition_description}
                  onChange={(e) => setRequestForm({ ...requestForm, condition_description: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the medical condition and any relevant details..."
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  {editingRequest ? 'Update Request' : 'Create Request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('hospital-dashboard');
                    setEditingRequest(null);
                    setRequestForm({
                      surgery_type: '',
                      required_specialization: '',
                      urgency: 'Medium',
                      date: '',
                      location: '',
                      hospital_name: '',
                      condition_description: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {currentView === 'doctor-dashboard' && currentUser?.role === 'doctor' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Surgery Opportunities</h1>
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <h3 className="text-lg font-medium mb-4">Filter Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Surgery Type</label>
                  <input
                    type="text"
                    value={filters.surgery_type}
                    onChange={(e) => setFilters({ ...filters, surgery_type: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filter by surgery type..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <input
                    type="text"
                    value={filters.specialization}
                    onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filter by specialization..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Urgency</label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Urgencies</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Surgery Requests Feed */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{request.surgery_type}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.urgency === 'High' ? 'bg-red-100 text-red-800' :
                      request.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.urgency}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p><strong>Specialization:</strong> {request.required_specialization}</p>
                    <p><strong>Date:</strong> {new Date(request.date).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> {request.location}</p>
                    <p><strong>Hospital:</strong> {request.hospital_name}</p>
                    {request.condition_description && (
                      <p><strong>Description:</strong> {request.condition_description}</p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {hasExpressedInterest(request.id) ? (
                      <button
                        onClick={() => handleWithdrawInterest(request.id)}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Withdraw Interest
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExpressInterest(request.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Express Interest
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No surgery requests found</div>
                <div className="text-gray-400 text-sm mt-2">Try adjusting your filters</div>
              </div>
            )}
          </div>
        )}

        {currentView === 'my-interests' && currentUser?.role === 'doctor' && (
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Interests</h1>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myInterests.map((item) => (
                <div key={item.interest.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{item.request.surgery_type}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.request.urgency === 'High' ? 'bg-red-100 text-red-800' :
                      item.request.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.request.urgency}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p><strong>Specialization:</strong> {item.request.required_specialization}</p>
                    <p><strong>Date:</strong> {new Date(item.request.date).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> {item.request.location}</p>
                    <p><strong>Hospital:</strong> {item.request.hospital_name}</p>
                    <p><strong>Interested on:</strong> {new Date(item.interest.timestamp).toLocaleDateString()}</p>
                    {item.request.condition_description && (
                      <p><strong>Description:</strong> {item.request.condition_description}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleWithdrawInterest(item.request.id)}
                    className="w-full bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Withdraw Interest
                  </button>
                </div>
              ))}
            </div>
            
            {myInterests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No interests yet</div>
                <div className="text-gray-400 text-sm mt-2">Browse surgery requests to express interest</div>
                <button
                  onClick={() => setCurrentView('doctor-dashboard')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Browse Requests
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;