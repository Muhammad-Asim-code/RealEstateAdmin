'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Search, MoreVertical, Loader2, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  status: string;
  category: string;
  price: number;
  city: string;
  created_at: string;
  property_status: string | null;
  property_images: { url: string }[];
}

export default function PropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_images(url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data as any || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProperty(id: string) {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      setProperties(properties.filter(p => p.id !== id));
      alert('Property deleted successfully!');
    } catch (error: any) {
      alert('Error deleting property: ' + error.message);
    }
  }

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All Properties</h1>
          <p className="text-slate-500 mt-1">Manage all your listed properties and their status.</p>
        </div>
        <Link href="/dashboard/add-property" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md">
          Add New Property
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Status & Category</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Property Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No properties found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                            {property.property_images?.[0]?.url ? (
                              <img src={property.property_images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 uppercase font-bold text-xl">
                                {property.name[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{property.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">Added on {new Date(property.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${property.status === 'For Sale' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                            {property.status}
                          </span>
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Home size={14} className="text-slate-400" />
                            {property.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800">{property.city}</span>
                          <span className="text-xs text-slate-500 truncate max-w-45">Pakistan</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border uppercase tracking-wider ${
                          (property.property_status || 'Available').toLowerCase() === 'sold'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-green-50 text-green-700 border-green-100'
                        }`}>
                          {property.property_status || 'Available'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-blue-600">
                          ${property.price.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => deleteProperty(property.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
