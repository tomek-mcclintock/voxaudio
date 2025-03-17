// src/app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, UserPlus, Shield, Users, Building } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CompanyProfileForm from '@/components/CompanyProfileForm';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  created_at: string;
  status?: string;
}

export default function SettingsPage() {
  const company = useCompany();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('standard');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const supabase = createClientComponentClient();
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{email: string, password: string} | null>(null);

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
        
        // Check if current user is admin
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();
          
        if (data?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Generate a secure random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createUser = async () => {
    if (!newUserEmail) {
      setError('Email is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          role: newUserRole,
          password: newUserPassword || undefined, // Only send if provided
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      setSuccess(`User created successfully: ${newUserEmail}`);
      if (data.credentials) {
        setCreatedUserCredentials({
          email: data.credentials.email,
          password: data.credentials.password
        });
      }
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isAdmin) {
      setError('Only admins can change user roles');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }
      
      setSuccess('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (userId: string, userEmail: string) => {
    if (!isAdmin) {
      setError('Only admins can remove users');
      return;
    }
    
    // Don't allow removing yourself
    if (userEmail === currentUserEmail) {
      setError('You cannot remove yourself');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${userEmail} from your company?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user');
      }
      
      setSuccess('User removed successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      if (data.credentials) {
        setCreatedUserCredentials({
          email: data.credentials.email,
          password: data.credentials.password
        });
      }
      setSuccess('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
      
      {/* Tabs */}
      <div className="mb-8 border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="w-5 h-5 mr-2" />
            Company Profile
          </button>
        </div>
      </div>
      
      {activeTab === 'users' && (
        <>
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              {error}
              <button 
                className="float-right" 
                onClick={() => setError(null)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
              {success}
              <button 
                className="float-right" 
                onClick={() => setSuccess(null)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Credentials display after user creation */}
          {createdUserCredentials && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold mb-2">New User Credentials</h3>
                  <p className="mb-1"><strong>Email:</strong> {createdUserCredentials.email}</p>
                  <p className="mb-2"><strong>Password:</strong> {createdUserCredentials.password}</p>
                  <p className="text-sm">Please save this information and share it securely with the user. This is the only time the password will be shown.</p>
                </div>
                <button 
                  className="text-yellow-800" 
                  onClick={() => setCreatedUserCredentials(null)}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          {/* Create User Form */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-medium mb-4">Add New User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password (optional)
                  </label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If left blank, a secure password will be generated automatically.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="admin">Admin</option>
                    <option value="standard">Standard User</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Admin users can manage other users and all settings. Standard users can create campaigns and view feedback.
                  </p>
                </div>
                
                <button
                  onClick={createUser}
                  disabled={loading || !newUserEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Create User
                </button>
              </div>
            </div>
          )}
          
          {/* User List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium">Team Members</h2>
              <p className="text-sm text-gray-500">
                Manage users who have access to {company.name}'s feedback system.
              </p>
            </div>
            <div>
              {loading && <p className="p-6 text-center">Loading users...</p>}
              
              {!loading && users.length === 0 && (
                <p className="p-6 text-center">No users found.</p>
              )}
              
              {!loading && users.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Added
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className={user.email === currentUserEmail ? "bg-blue-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.email}
                            {user.email === currentUserEmail && (
                              <span className="ml-2 text-xs text-blue-600">(You)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isAdmin && user.email !== currentUserEmail ? (
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              className="text-sm text-gray-900 border-gray-300 rounded-md"
                            >
                              <option value="admin">Admin</option>
                              <option value="standard">Standard User</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'admin' ? 'Admin' : 'Standard User'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {user.email !== currentUserEmail && (
                                <>
                                  <button
                                    onClick={() => resetPassword(user.id)}
                                    title="Reset Password"
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <Edit2 className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => removeUser(user.id, user.email)}
                                    title="Remove User"
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Company Profile</h2>
          <CompanyProfileForm company={company} />
        </div>
      )}
    </div>
  );
}