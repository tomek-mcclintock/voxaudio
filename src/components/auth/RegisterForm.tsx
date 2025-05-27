'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    domain: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors = [];
    if (password.length < 8) {
      errors.push('At least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('At least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('At least one special character');
    }
    return errors;
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordErrors(validatePassword(password));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password requirements
    const passwordValidationErrors = validatePassword(formData.password);
    if (passwordValidationErrors.length > 0) {
      setError('Password does not meet requirements');
      setLoading(false);
      return;
    }

    try {
      // Create the company and user account
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Now sign the user in automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        // If auto sign-in fails, redirect to login with a message
        router.push('/login?message=Registration successful, please sign in');
        return;
      }

      // Redirect to campaigns page
      router.push('/dashboard/campaigns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = passwordErrors.length === 0 && formData.password.length > 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Register Your Company</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.companyName}
            onChange={(e) => setFormData({
              ...formData,
              companyName: e.target.value
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Email
          </label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.email}
            onChange={(e) => setFormData({
              ...formData,
              email: e.target.value
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 ${
              formData.password.length > 0 && !isPasswordValid 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            value={formData.password}
            onChange={(e) => handlePasswordChange(e.target.value)}
          />
          
          {/* Password requirements indicator */}
          {formData.password.length > 0 && (
            <div className="mt-2 text-xs space-y-1">
              <p className="font-medium text-gray-700">Password must include:</p>
              {[
                { check: formData.password.length >= 8, text: 'At least 8 characters' },
                { check: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
                { check: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
                { check: /\d/.test(formData.password), text: 'One number' },
                { check: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password), text: 'One special character' }
              ].map((requirement, index) => (
                <div key={index} className={`flex items-center ${requirement.check ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-1">{requirement.check ? '✓' : '✗'}</span>
                  <span>{requirement.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 ${
              formData.confirmPassword.length > 0 && !doPasswordsMatch
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({
              ...formData,
              confirmPassword: e.target.value
            })}
          />
          
          {/* Password match indicator */}
          {formData.confirmPassword.length > 0 && (
            <div className={`mt-1 text-xs flex items-center ${doPasswordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-1">{doPasswordsMatch ? '✓' : '✗'}</span>
              <span>{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Domain (optional)
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="example.com"
            value={formData.domain}
            onChange={(e) => setFormData({
              ...formData,
              domain: e.target.value
            })}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isPasswordValid || !doPasswordsMatch}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-sm text-gray-600">Already have an account? </span>
        <a href="/login" className="text-sm text-blue-600 hover:underline">
          Sign in here
        </a>
      </div>
    </div>
  );
}