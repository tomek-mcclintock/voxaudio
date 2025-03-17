// src/components/CompanyProfileForm.tsx
'use client';

import { useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Upload, Check, X, RefreshCw } from 'lucide-react';
import type { CompanyContextType } from '@/lib/contexts/CompanyContext';
import Image from 'next/image';

interface CompanyProfileFormProps {
  company: CompanyContextType;
}

export default function CompanyProfileForm({ company }: CompanyProfileFormProps) {
  const [primaryColor, setPrimaryColor] = useState(company.primary_color || '#657567');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Logo file is too large. Please upload an image smaller than 5MB.');
      return;
    }

    setLogo(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrimaryColor(e.target.value);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logo) return company.logo_url || null;
    
    setIsUploading(true);
    try {
      // Create a unique file name
      const fileExt = logo.name.split('.').pop();
      const fileName = `${company.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, logo);
      
      if (uploadError) throw uploadError;
      
      // Get public URL for the uploaded file
      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Failed to upload logo. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First upload the logo if there is one
      const logoUrl = await uploadLogo();
      
      // Update the company profile - REMOVED updated_at field
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          primary_color: primaryColor,
          logo_url: logoUrl
        })
        .eq('id', company.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Company profile updated successfully!');
      
      // Refresh the page after a short delay to show the updated company data
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error('Error updating company profile:', err);
      setError('Failed to update company profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary Color Picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Primary Brand Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={handleColorChange}
            className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={handleColorChange}
            pattern="^#[0-9A-Fa-f]{6}$"
            placeholder="#657567"
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500">
          This color will be used for buttons, links, and accents on your feedback pages.
        </p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Company Logo
        </label>
        
        {logoPreview ? (
          <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="relative h-32 w-full max-w-md">
              <Image
                src={logoPreview}
                alt="Company logo preview"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Change Logo
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400">
              SVG, PNG, or JPG (max. 5MB)
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="hidden"
        />
        
        <p className="text-xs text-gray-500">
          Your logo will appear in the header of your feedback pages.
        </p>
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Preview</h3>
        <div className="p-4 border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center p-3 border-b" style={{ borderColor: primaryColor }}>
            {logoPreview ? (
              <div className="relative h-8 w-32">
                <Image
                  src={logoPreview}
                  alt="Company logo"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="text-lg font-semibold">{company.name}</div>
            )}
          </div>
          <div className="p-3 space-y-3">
            <div className="max-w-xs mx-auto">
              <div className="text-center mb-2">How likely are you to recommend us?</div>
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3].map((num) => (
                  <div 
                    key={num}
                    className="w-8 h-8 flex items-center justify-center rounded text-white text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {num}
                  </div>
                ))}
                <div className="text-sm">...</div>
              </div>
              <button
                type="button"
                className="w-full py-2 px-3 rounded text-white text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex justify-between items-center">
          <span className="flex items-center">
            <Check className="w-4 h-4 mr-2" />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting || isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {isUploading ? 'Uploading...' : 'Saving...'}
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}