import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { User, UserRole, Department, Site } from '../types';
import { supabase } from '../supabase/client';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface UserEditModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (user: Partial<User> & { password?: string }) => void;
}

const departmentOptions = Object.values(Department).map(d => ({ value: d, label: d }));

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: '#ffffff',
    borderColor: state.isFocused ? '#0ea5e9' : '#d4d4d8',
    boxShadow: state.isFocused ? '0 0 0 1px #0ea5e9' : 'none',
  }),
  menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
};


const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.SiteManager,
    sites: [] as string[],
    departments: [] as Department[],
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [availableSites, setAvailableSites] = useState<{ value: string; label: string; }[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
        setSitesLoading(true);
        const { data, error } = await supabase.from('en_sites').select('name').eq('status', 'Active');
        if (error) {
            console.error("Failed to fetch sites for modal", error);
        } else {
            setAvailableSites((data as any[]).map(s => ({ value: s.name, label: s.name })));
        }
        setSitesLoading(false);
    };
    fetchSites();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        sites: user.sites || [],
        departments: user.departments || [],
      });
      setPassword('');
    } else {
      // Reset form for new user
      setFormData({
        name: '',
        email: '',
        role: UserRole.SiteManager,
        sites: [],
        departments: [],
      });
      setPassword('');
    }
    setShowPassword(false);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleMultiSelectChange = (name: 'sites' | 'departments', selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
    setFormData(prev => ({ ...prev, [name]: values }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<User> & { password?: string } = {
        ...formData,
        id: user?.id,
        status: user?.status,
    };
    if (!user) { // If it's a new user, add the password
        payload.password = password;
    }
    onSave(payload);
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 font-sans"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 overflow-hidden transform transition-all border border-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-zinc-200 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">{user ? 'Edit User' : 'Add New User'}</h2>
                    <p className="text-sm text-zinc-500">Manage user details and role assignments.</p>
                </div>
                 <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                    aria-label="Close modal"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
            </div>

            <div className="p-6 space-y-4 bg-zinc-50 max-h-[70vh] overflow-y-auto">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
                    />
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
                    />
                </div>
                {!user && (
                  <div>
                      <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                      <div className="relative">
                          <input
                              type={showPassword ? 'text' : 'password'}
                              id="password"
                              name="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="w-full p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                          </button>
                      </div>
                  </div>
                )}
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
                    >
                        {Object.values(UserRole).map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label htmlFor="departments" className="block text-sm font-medium text-zinc-700 mb-1">Departments</label>
                    <Select
                        id="departments"
                        isMulti
                        options={departmentOptions}
                        value={departmentOptions.filter(opt => formData.departments.includes(opt.value))}
                        onChange={(opts) => handleMultiSelectChange('departments', opts)}
                        styles={customSelectStyles}
                        className="w-full text-zinc-900"
                    />
                </div>
                 <div>
                    <label htmlFor="sites" className="block text-sm font-medium text-zinc-700 mb-1">Assigned Sites</label>
                    <Select
                        id="sites"
                        isMulti
                        isLoading={sitesLoading}
                        options={availableSites}
                        value={availableSites.filter(opt => formData.sites.includes(opt.value))}
                        onChange={(opts) => handleMultiSelectChange('sites', opts)}
                        styles={customSelectStyles}
                        className="w-full text-zinc-900"
                    />
                </div>
            </div>

            <div className="p-4 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-200 text-zinc-800 font-semibold rounded-md hover:bg-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 transition-colors"
              >
                Save User
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;