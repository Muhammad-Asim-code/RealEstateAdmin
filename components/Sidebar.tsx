'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Home, PlusCircle, Settings, LogOut, User, Mail } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Properties', href: '/dashboard/properties', icon: Home },
    { label: 'Visit Requests', href: '/dashboard/visit-requests', icon: Settings },
    { label: 'Contacts', href: '/dashboard/contacts', icon: Mail },
    { label: 'User Profiles', href: '/dashboard/profiles', icon: User },
    // { label: 'Add Property', href: '/dashboard/add-property', icon: PlusCircle },
  ];

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 text-white border-r border-slate-800 fixed left-0 top-0">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-blue-400">EstateAdmin</h2>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;

