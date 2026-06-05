'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Mail, MapPin, CheckCircle, XCircle, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  city: string | null;
  province: string | null;
  is_verified: boolean;
  updated_at: string;
}

export default function ProfilesPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVerification(email: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('email', email);

      if (error) throw error;
      
      setProfiles(prev => prev.map(p => 
        p.email === email ? { ...p, is_verified: !currentStatus } : p
      ));
    } catch (error: any) {
      alert('Error updating verification: ' + error.message);
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">User Profiles</h1>
        <p className="text-slate-500 mt-2">Manage user accounts and verification status.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Verification Status</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No user profiles found.
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr key={profile.email} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            {profile.full_name || 'No Name'}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                            <Mail size={14} className="text-slate-400" />
                            {profile.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          {profile.city && profile.province 
                            ? `${profile.city}, ${profile.province}` 
                            : profile.city || profile.province || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {profile.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <ShieldCheck size={14} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-red-200">
                            <ShieldAlert size={14} />
                            Not Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(profile.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => toggleVerification(profile.email, profile.is_verified)}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                            profile.is_verified 
                              ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                          }`}
                        >
                          {profile.is_verified ? 'Unverify' : 'Verify Now'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
