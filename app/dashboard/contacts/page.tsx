'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, User, Loader2 } from 'lucide-react';

interface ContactMessage {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: string | null;
  created_at: string | null;
}

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data as ContactMessage[]) || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRead(id: string, currentStatus: string | null) {
    try {
      const newStatus = currentStatus === 'read' ? 'unread' : 'read';
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  }

  return (
    <div className="pb-10 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-500 mt-2">Messages submitted via the contact form.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Sender</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Received</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No contact messages found.
                    </td>
                  </tr>
                ) : (
                  messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            {msg.full_name}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                            <Mail size={14} className="text-slate-400" />
                            {msg.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{msg.subject}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-normal wrap-break-word">{msg.message}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${msg.status === 'read' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {msg.status || 'unread'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleRead(msg.id, msg.status)}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${msg.status === 'read' ? 'bg-slate-100 text-slate-600 hover:bg-yellow-50 hover:text-yellow-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'}`}
                        >
                          {msg.status === 'read' ? 'Mark Unread' : 'Mark Read'}
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
