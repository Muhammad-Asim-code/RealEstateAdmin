'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, Phone, Loader2, AlertCircle, CheckCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';

interface VisitRequest {
  id: string;
  property_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  visit_date: string;
  time_slot: string;
  notes: string | null;
  status: string;
  created_at: string;
  properties: {
    id: string;
    name: string;
    price: number | null;
    availability: string | null;
    property_status: string | null;
    sold_at: string | null;
    sold_prize: number | null;
    sold_to_user: string | null;
  } | null;
  profiles?: {
    email: string;
  } | null;
}

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
];

export default function VisitRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [rescheduleReq, setRescheduleReq] = useState<VisitRequest | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('pending');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [markAsSoldReq, setMarkAsSoldReq] = useState<VisitRequest | null>(null);
  const [soldCostInput, setSoldCostInput] = useState<number>(0);
  const [isSubmittingSold, setIsSubmittingSold] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      setLoading(true);

      // Step 1: Fetch visit requests and property details
      const { data: requestData, error: requestError } = await supabase
        .from('visit_requests')
        .select('*, properties(id, name, price, availability, property_status, sold_at, sold_prize, sold_to_user)')
        .order('visit_date', { ascending: false });

      if (requestError) throw requestError;

      // Step 2: Manually fetch profiles for these requests to bypass join limitation
      const userIds = requestData
        .map(r => r.user_id)
        .filter((id): id is string => !!id);

      let profilesMap: Record<string, { email: string }> = {};

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (!profileError && profileData) {
          profileData.forEach(p => {
            profilesMap[p.id] = { email: p.email };
          });
        }
      }

      // Step 3: Combine data
      const combinedData = requestData.map(req => ({
        ...req,
        profiles: req.user_id ? profilesMap[req.user_id] : null
      }));

      setRequests(combinedData as any);
    } catch (error: any) {
      console.error('Final Error Fetching:', error.message || error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const currentRequest = requests.find(r => r.id === id);

      const { error } = await supabase
        .from('visit_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // If status changed to approved and user has an email, send the notification
      if (newStatus === 'approved' && currentRequest?.profiles?.email) {
        fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentRequest.profiles.email,
            userName: currentRequest.name,
            visitDate: currentRequest.visit_date,
            timeSlot: currentRequest.time_slot
          })
        }).catch(err => console.error('Failed to send email:', err));
      }

      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, status: newStatus } : req
      ));
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  }

  function handleStatusChange(req: VisitRequest, status: string) {
    if (status === 'cancelled') {
      setRescheduleReq(req);
      const suggestions = getSuggestions(req.property_id);
      if (suggestions.length > 0) {
        setSelectedDate(suggestions[0].date);
        setSelectedSlot(suggestions[0].slot);
      } else {
        setSelectedDate('');
        setSelectedSlot('');
      }
      setNewStatus('approved'); // default rescheduled status to approved
    } else {
      updateStatus(req.id, status);
    }
  }

  const getSuggestions = (propertyId: string) => {
    const suggestions: { date: string; slot: string }[] = [];
    const today = new Date();

    // Check next 7 days starting tomorrow
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = format(date, 'yyyy-MM-dd');

      for (const slot of TIME_SLOTS) {
        const isSlotTaken = requests.some(req =>
          req.status !== 'cancelled' &&
          req.property_id === propertyId &&
          req.visit_date === dateString &&
          req.time_slot === slot
        );

        if (!isSlotTaken) {
          suggestions.push({ date: dateString, slot });
        }
        if (suggestions.length >= 6) {
          return suggestions;
        }
      }
    }
    return suggestions;
  };

  const isCustomSlotConflict = (date: string, slot: string) => {
    if (!rescheduleReq) return false;
    return requests.some(req =>
      req.id !== rescheduleReq.id &&
      req.status !== 'cancelled' &&
      req.property_id === rescheduleReq.property_id &&
      req.visit_date === date &&
      req.time_slot === slot
    );
  };

  async function confirmReschedule() {
    if (!rescheduleReq || !selectedDate || !selectedSlot) return;

    try {
      setIsSendingEmail(true);

      // Step 1: Update in database
      const { error } = await supabase
        .from('visit_requests')
        .update({
          visit_date: selectedDate,
          time_slot: selectedSlot,
          status: newStatus
        })
        .eq('id', rescheduleReq.id);

      if (error) throw error;

      // Step 2: Update local state
      setRequests(prev => prev.map(req =>
        req.id === rescheduleReq.id
          ? { ...req, visit_date: selectedDate, time_slot: selectedSlot, status: newStatus }
          : req
      ));

      // Step 3: Send reschedule email notification
      if (rescheduleReq.profiles?.email) {
        await fetch('/api/send-reschedule-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: rescheduleReq.profiles.email,
            userName: rescheduleReq.name,
            oldDate: rescheduleReq.visit_date,
            oldSlot: rescheduleReq.time_slot,
            newDate: selectedDate,
            newSlot: selectedSlot
          })
        });
      }

      setRescheduleReq(null);
    } catch (error: any) {
      alert('Error rescheduling: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  }

  function openMarkAsSoldModal(req: VisitRequest) {
    setMarkAsSoldReq(req);
    setSoldCostInput(req.properties?.price || 0);
  }

  async function handleConfirmSold() {
    if (!markAsSoldReq) return;

    try {
      setIsSubmittingSold(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Update in properties table
      const { error } = await supabase
        .from('properties')
        .update({
          sold_to_user: markAsSoldReq.user_id || null,
          sold_prize: soldCostInput,
          sold_at: todayStr,
          availability: 'sold',
          property_status: 'Sold'
        })
        .eq('id', markAsSoldReq.property_id);

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(req => {
        if (req.property_id === markAsSoldReq.property_id) {
          return {
            ...req,
            properties: req.properties ? {
              ...req.properties,
              availability: 'sold',
              property_status: 'Sold',
              sold_to_user: markAsSoldReq.user_id || null,
              sold_prize: soldCostInput,
              sold_at: todayStr
            } : null
          };
        }
        return req;
      }));

      setMarkAsSoldReq(null);
      alert('Property marked as sold successfully!');
    } catch (error: any) {
      alert('Error marking property as sold: ' + error.message);
    } finally {
      setIsSubmittingSold(false);
    }
  }

  const isConflict = (currentReq: VisitRequest) => {
    if (currentReq.status === 'cancelled') return false;

    // A conflict exists if another active request exists for same property, date and slot
    const hasExisting = requests.some(req =>
      req.id !== currentReq.id &&
      req.status !== 'cancelled' &&
      req.property_id === currentReq.property_id &&
      req.visit_date === currentReq.visit_date &&
      req.time_slot === currentReq.time_slot
    );

    if (!hasExisting) return false;

    // Based on timestamp: mark as conflict/red if there's an EARLIER active request for the same slot on the same property
    // Meaning THIS one is the "late" arrival for that slot. Uses request ID as a tie-breaker.
    const isLatecomer = requests.some(req => {
      if (
        req.id === currentReq.id ||
        req.status === 'cancelled' ||
        req.property_id !== currentReq.property_id ||
        req.visit_date !== currentReq.visit_date ||
        req.time_slot !== currentReq.time_slot
      ) {
        return false;
      }

      const reqTime = new Date(req.created_at).getTime();
      const currentReqTime = new Date(currentReq.created_at).getTime();

      if (reqTime !== currentReqTime) {
        return reqTime < currentReqTime;
      }
      return req.id < currentReq.id;
    });

    return isLatecomer;
  };


  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Visit Requests</h1>
        <p className="text-slate-500 mt-2">Manage property visit appointments and schedule conflicts.</p>
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
                  <th className="px-6 py-4">Client Information</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Visit Schedule</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No visit requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const hasConflict = isConflict(req);
                    return (
                      <tr
                        key={req.id}
                        className={`transition-colors ${hasConflict
                          ? 'bg-red-50 hover:bg-red-100/80'
                          : 'hover:bg-slate-50'
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User size={14} className="text-slate-400" />
                              {req.name}
                            </span>
                            <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                              <Phone size={14} className="text-slate-400" />
                              {req.phone}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700">{req.properties?.name || 'Unknown Property'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`text-sm flex items-center gap-2 ${hasConflict ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                              <Calendar size={14} />
                              {req.visit_date}
                            </span>
                            <span className={`text-sm flex items-center gap-2 ${hasConflict ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                              <Clock size={14} />
                              {req.time_slot}
                              {hasConflict && (
                                <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                                  <AlertCircle size={10} /> Conflict
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={req.status}
                            onChange={(e) => handleStatusChange(req, e.target.value)}
                            className={`text-xs font-bold px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${req.status === 'approved'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-500 truncate max-w-50" title={req.notes || ''}>
                            {req.notes || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.properties?.availability === 'sold' ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-green-200 shadow-sm">
                              <CheckCircle size={12} className="text-green-600" /> Sold for ${req.properties.sold_prize?.toLocaleString()}
                            </span>
                          ) : (
                            <button
                              onClick={() => openMarkAsSoldModal(req)}
                              className="text-xs font-bold text-blue-600 hover:text-white px-3 py-1.5 border border-blue-200 hover:border-blue-600 hover:bg-blue-600 rounded-lg transition-all cursor-pointer"
                            >
                              Mark as Sold
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rescheduleReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={20} />
                Conflict Reschedule Suggestions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Reschedule <strong>{rescheduleReq.name}</strong> because the requested slot is conflict-flagged or unavailable.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Original booking details */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-sm">
                <p className="text-amber-800 font-semibold mb-1">Original Booking (Conflict)</p>
                <div className="text-slate-600 flex flex-wrap gap-x-4">
                  <span><strong>Date:</strong> {rescheduleReq.visit_date}</span>
                  <span><strong>Time:</strong> {rescheduleReq.time_slot}</span>
                </div>
              </div>

              {/* Suggested free slots */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Suggested Available Slots
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getSuggestions(rescheduleReq.property_id).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDate(s.date);
                        setSelectedSlot(s.slot);
                      }}
                      className={`text-left p-2.5 rounded-lg border text-xs font-medium transition-all ${selectedDate === s.date && selectedSlot === s.slot
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="font-semibold text-slate-900">
                        {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-slate-500 mt-0.5">{s.slot}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom selectors if they want something else */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Custom Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Custom Time Slot
                  </label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* New Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Rescheduled Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              {/* Custom Conflict Warning */}
              {isCustomSlotConflict(selectedDate, selectedSlot) && (
                <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-2.5 text-xs flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Warning: This slot is already booked. Please choose another slot.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  updateStatus(rescheduleReq.id, 'cancelled');
                  setRescheduleReq(null);
                }}
                className="w-full sm:w-auto text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-200 rounded-lg hover:bg-white transition-all order-last sm:order-first"
              >
                Just Cancel (No Reschedule)
              </button>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setRescheduleReq(null)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedDate || !selectedSlot || isSendingEmail || isCustomSlotConflict(selectedDate, selectedSlot)}
                  onClick={confirmReschedule}
                  className="bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Rescheduling...
                    </>
                  ) : (
                    'Confirm Reschedule'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {markAsSoldReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Mark Property as Sold
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Record the final sale details for this property.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Client Name
                </label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>{markAsSoldReq.name}</span>
                  {markAsSoldReq.user_id ? (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Registered Client</span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Guest Client</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Property Information
                </label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {markAsSoldReq.properties?.name || 'Unknown Property'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Actual Price
                  </label>
                  <div className="text-sm font-bold text-blue-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    ${markAsSoldReq.properties?.price?.toLocaleString() || '0'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cost at Sold ($)
                  </label>
                  <input
                    type="number"
                    value={soldCostInput || ''}
                    onChange={(e) => setSoldCostInput(Number(e.target.value))}
                    className="w-full text-sm font-bold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                    placeholder="Enter sale price"
                  />
                </div>
              </div>

              {!markAsSoldReq.user_id && (
                <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-lg p-2.5 text-xs">
                  <strong>Note:</strong> Since this client is a guest, the property will be marked as sold without a <code>sold_to_user</code> link. Only the price and date will be recorded.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMarkAsSoldReq(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingSold || !soldCostInput || soldCostInput <= 0}
                onClick={handleConfirmSold}
                className="bg-green-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-green-700 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingSold ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Updating...
                  </>
                ) : (
                  'Confirm Sale'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
