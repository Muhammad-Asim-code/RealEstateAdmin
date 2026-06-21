'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Home, Key, Loader2, MoreVertical, Search, Filter, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  status: string;
  category: string;
  price: number;
  city: string;
  created_at: string;
  property_images: { url: string }[];
  sold_prize?: number | null;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sale: 0, rent: 0, totalSales: 0 });
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // Fetch stats
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*, property_images(url)');

      if (error) throw error;

      if (properties) {
        const total = properties.length;
        const sale = properties.filter(p => p.status === 'For Sale').length;
        const rent = properties.filter(p => p.status === 'For Rent').length;
        const totalSales = properties.reduce((sum: number, p: any) => sum + (Number(p.sold_prize ?? 0) || 0), 0);
        setStats({ total, sale, rent, totalSales });
        
        // Sort by date and take recent 5
        const sorted = [...properties].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5);
        
        setRecentProperties(sorted as any);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <Link href="/dashboard/add-property" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all text-sm">
          + Add Property
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
            { label: 'Total Properties', value: stats.total, color: 'bg-blue-500', icon: <Home className="text-blue-600" size={20}/> , type: 'number'},
            { label: 'For Sale', value: stats.sale, color: 'bg-green-500', icon: <TagIcon className="text-green-600" size={20}/> , type: 'number'},
            { label: 'For Rent', value: stats.rent, color: 'bg-purple-500', icon: <Key className="text-purple-600" size={20}/> , type: 'number'},
            { label: 'Total Sales', value: stats.totalSales, color: 'bg-rose-500', icon: <DollarSign className="text-rose-600" size={20}/> , type: 'currency'},
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.type === 'currency' ? `$${(stat.value || 0).toLocaleString()}` : stat.value}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  {stat.icon}
                </div>
              </div>
              <div className={`absolute bottom-0 left-0 h-1 w-full ${stat.color} opacity-20`}></div>
            </div>
          ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Recent Listings</h2>
          <Link href="/dashboard/properties" className="text-blue-600 text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          {recentProperties.length === 0 ? (
            <div className="text-slate-500 text-center py-12">
              No properties found. Add your first property to see it here!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProperties.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {property.property_images?.[0]?.url ? (
                            <img src={property.property_images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Home size={20} />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 text-sm truncate max-w-37.5">{property.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{property.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        property.status === 'For Sale' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {property.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      ${property.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{property.category}</td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function TagIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12.586 2.586 19 9l-7 7-6.414-6.414a2 2 0 0 1 0-2.828l6.414-6.414a2 2 0 0 1 2.828 0Z"/><path d="m15 5 3 3"/><circle cx="9" cy="9" r=".5" fill="currentColor"/></svg>
  )
}

