'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Search, MoreVertical, Loader2, Trash2, Edit } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  status: string;
  category: string;
  price: number;
  city: string;
  address: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  parking_spaces: number | null;
  features: string[] | null;
  created_at: string;
  property_status: string | null;
  availability: string | null;
  property_images: { id: string; url: string }[];
}

export default function PropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPassword, setBuyerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [soldPrice, setSoldPrice] = useState<number | undefined>(undefined);

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [processingSell, setProcessingSell] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState<number | undefined>(undefined);
  const [editBedrooms, setEditBedrooms] = useState<number | undefined>(undefined);
  const [editBathrooms, setEditBathrooms] = useState<number | undefined>(undefined);
  const [editSqft, setEditSqft] = useState<number | undefined>(undefined);
  const [editYearBuilt, setEditYearBuilt] = useState<number | undefined>(undefined);
  const [editParkingSpaces, setEditParkingSpaces] = useState<number | undefined>(undefined);
  const [editFeaturesInput, setEditFeaturesInput] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [editImages, setEditImages] = useState<{ id?: string; url: string }[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingBuyerId, setExistingBuyerId] = useState<string | null>(null);
  const [existingEmailMessage, setExistingEmailMessage] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  function setError(field: string, message: string) {
    setValidationErrors(prev => ({ ...prev, [field]: message }));
  }

  function clearError(field: string) {
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }

  async function checkEmailOnBlur() {
    if (!buyerEmail) return;
    try {
      setCheckingEmail(true);
      const { data: existing, error: existErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', buyerEmail)
        .maybeSingle();
      if (existErr) {
        console.error('Error checking profile', existErr);
        return;
      }
      if (existing && (existing as any).id) {
        setExistingBuyerId((existing as any).id);
        setExistingEmailMessage('Email already registered. No OTP needed.');
        setBuyerName((existing as any).full_name || buyerName);
      } else {
        setExistingBuyerId(null);
        setExistingEmailMessage(null);
      }
    } catch (error: any) {
      console.error('Error checking email', error);
    } finally {
      setCheckingEmail(false);
    }
  }

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_images(id, url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data as any || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteProperty(property: { id: string; name: string }) {
    setPropertyToDelete(property);
    setShowDeleteModal(true);
  }

  async function deleteProperty(id: string) {
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      setProperties(properties.filter(p => p.id !== id));
      showNotification('success', 'Property deleted successfully!');
    } catch (error: any) {
      showNotification('error', 'Error deleting property: ' + error.message);
    } finally {
      setPropertyToDelete(null);
      setShowDeleteModal(false);
    }
  }

  function cancelDelete() {
    setPropertyToDelete(null);
    setShowDeleteModal(false);
  }

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openSellModal(property: Property) {
    if (property.availability !== 'available') {
      showNotification('error', 'This property is already sold or unavailable.');
      return;
    }
    setSelectedProperty(property);
    setShowSellModal(true);
    setBuyerEmail('');
    setBuyerName('');
    setBuyerPassword('');
    setConfirmPassword('');
    setSoldPrice(0);
    setGeneratedOtp(null);
    setEnteredOtp('');
    setExistingBuyerId(null);
    setExistingEmailMessage(null);
    setValidationErrors({});
  }

  function openEditModal(property: Property) {
    if (property.availability === 'sold' || property.property_status === 'Sold') {
      showNotification('error', 'Sold properties cannot be edited.');
      return;
    }

    setSelectedProperty(property);
    setEditName(property.name);
    setEditCategory(property.category);
    setEditCity(property.city);
    setEditAddress(property.address || '');
    setEditDescription(property.description || '');
    setEditPrice(property.price);
    setEditBedrooms(property.bedrooms ?? undefined);
    setEditBathrooms(property.bathrooms ?? undefined);
    setEditSqft(property.sqft ?? undefined);
    setEditYearBuilt(property.year_built ?? undefined);
    setEditParkingSpaces(property.parking_spaces ?? undefined);
    setEditFeaturesInput((property.features || []).join(', '));
    setEditStatus(property.status);
    setEditAvailability(property.availability || 'available');
    setEditImages(property.property_images?.map((image) => ({ id: image.id, url: image.url })) || []);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setShowEditModal(true);
    setValidationErrors({});
  }

  function closeSellModal() {
    setShowSellModal(false);
    setSelectedProperty(null);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setSelectedProperty(null);
  }

  async function savePropertyEdits() {
    if (!selectedProperty) return;

    setValidationErrors({});
    let hasErrors = false;

    if (!editName) {
      setError('editName', 'Property name is required');
      hasErrors = true;
    }
    if (!editCategory) {
      setError('editCategory', 'Category is required');
      hasErrors = true;
    }
    if (!editCity) {
      setError('editCity', 'City is required');
      hasErrors = true;
    }
    if (editPrice === undefined || editPrice <= 0) {
      setError('editPrice', 'Price must be greater than zero');
      hasErrors = true;
    }
    if (!editStatus) {
      setError('editStatus', 'Status is required');
      hasErrors = true;
    }

    if (hasErrors) return;

    try {
      setSavingEdit(true);
      const { error } = await supabase.from('properties').update({
        name: editName,
        status: editStatus,
        category: editCategory,
        price: editPrice,
        city: editCity,
        address: editAddress,
        description: editDescription,
        bedrooms: editBedrooms,
        bathrooms: editBathrooms,
        sqft: editSqft,
        year_built: editYearBuilt,
        parking_spaces: editParkingSpaces,
        features: editFeaturesInput
          .split(',')
          .map(feature => feature.trim())
          .filter(Boolean),
        availability: editAvailability,
      }).eq('id', selectedProperty.id);
      if (error) throw error;

      const { error: deleteImagesError } = await supabase.from('property_images').delete().eq('property_id', selectedProperty.id);
      if (deleteImagesError) throw deleteImagesError;

      const imageUrls = [
        ...editImages.map(image => image.url.trim()).filter(url => url),
      ];

      // upload any new files added in edit mode
      const uploadedImages = await Promise.all(newImageFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedProperty.id}/${Date.now()}-${index}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        return publicUrl;
      }));

      const allImageUrls = [...imageUrls, ...uploadedImages].filter(Boolean);
      const newImages = allImageUrls.map(url => ({ property_id: selectedProperty.id, url }));

      if (newImages.length > 0) {
        const { error: insertImagesError } = await supabase.from('property_images').insert(newImages);
        if (insertImagesError) throw insertImagesError;
      }

      showNotification('success', 'Property updated successfully!');
      closeEditModal();
      fetchProperties();
    } catch (error: any) {
      showNotification('error', `Error updating property: ${error.message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function sendOtp() {
    if (!buyerEmail) {
      setError('buyerEmail', 'Email is required');
      return;
    }
    clearError('buyerEmail');
    if (existingBuyerId) {
      showNotification('error', 'Email is already registered. No OTP needed.');
      return;
    }
    try {
      setSendingOtp(true);
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: buyerEmail, otp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send OTP');
      setGeneratedOtp(otp);
      showNotification('success', 'OTP sent to buyer email. Ask them to provide the code.');
    } catch (error: any) {
      showNotification('error', `Error sending OTP: ${error.message}`);
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyAndCreate() {
    if (!selectedProperty) return;
    
    // Check if property is still available
    if (selectedProperty.availability !== 'available') {
      showNotification('error', 'This property is no longer available for sale.');
      return;
    }
    
    setValidationErrors({});

    // Validation
    let hasErrors = false;
    if (!buyerName) {
      setError('buyerName', 'Buyer name is required');
      hasErrors = true;
    }
    if (!buyerEmail) {
      setError('buyerEmail', 'Email is required');
      hasErrors = true;
    }
    if (!existingBuyerId && !buyerPassword) {
      setError('buyerPassword', 'Password is required');
      hasErrors = true;
    }
    if (!existingBuyerId && buyerPassword !== confirmPassword) {
      setError('confirmPassword', 'Passwords do not match');
      hasErrors = true;
    }
    if (soldPrice === 0 || soldPrice === undefined) {
      setError('soldPrice', 'Sold price is required');
      hasErrors = true;
    }
    if (!existingBuyerId && !generatedOtp) {
      setError('enteredOtp', 'OTP is required');
      hasErrors = true;
    }
    if (!existingBuyerId && enteredOtp !== generatedOtp) {
      setError('enteredOtp', 'OTP does not match');
      hasErrors = true;
    }

    if (hasErrors) return;

    try {
      setProcessingSell(true);
      let id = existingBuyerId;
      if (!id) {
        id = crypto.randomUUID();
        const { error: insertErr } = await supabase.from('profiles').insert([{
          id,
          email: buyerEmail,
          password: buyerPassword,
          full_name: buyerName,
          is_verified: true,
        }]);
        if (insertErr) throw insertErr;
      }

      const { error: updateErr } = await supabase.from('properties').update({
        sold_to_user: id,
        sold_at: new Date().toISOString(),
        sold_prize: soldPrice,
        property_status: 'Sold',
        availability: 'sold',
      }).eq('id', selectedProperty.id);
      if (updateErr) throw updateErr;

      showNotification('success', 'Property sold successfully!');
      closeSellModal();
      fetchProperties();
    } catch (error: any) {
      showNotification('error', `Error completing sale: ${error.message}`);
    } finally {
      setProcessingSell(false);
    }
  }

  return (
    <>
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
                          {property.price.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(property)}
                            disabled={property.availability === 'sold' || property.property_status === 'Sold'}
                            className={`p-2 text-slate-400 rounded-lg transition-all ${property.availability === 'sold' || property.property_status === 'Sold' ? 'cursor-not-allowed opacity-50' : 'hover:text-blue-600 hover:bg-blue-50'}`}
                            title={property.availability === 'sold' || property.property_status === 'Sold' ? 'Sold properties cannot be edited' : 'Edit property'}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => openSellModal(property)}
                            disabled={property.availability !== 'available'}
                            className={`p-2 rounded-lg transition-all ${
                              property.availability !== 'available'
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={property.availability !== 'available' ? 'Property already sold' : 'Sell property'}
                          >
                            <DollarSign size={18} />
                          </button>
                          <button
                            onClick={() => confirmDeleteProperty({ id: property.id, name: property.name })}
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
      {showSellModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-slate-900 rounded-lg w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Sell: {selectedProperty.name}</h2>
              <button onClick={closeSellModal} className="text-slate-700 hover:text-slate-900 font-medium">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Buyer Full Name</label>
                <input 
                  value={buyerName} 
                  onChange={e => { setBuyerName(e.target.value); clearError('buyerName'); }} 
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.buyerName ? 'border-red-500' : 'border-slate-200'
                  }`} 
                />
                {validationErrors.buyerName && <p className="mt-1 text-xs text-red-600">{validationErrors.buyerName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Buyer Email</label>
                <input 
                  value={buyerEmail} 
                  onChange={e => { setBuyerEmail(e.target.value); setExistingBuyerId(null); setExistingEmailMessage(null); clearError('buyerEmail'); }}
                  onBlur={checkEmailOnBlur}
                  disabled={checkingEmail}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 disabled:bg-slate-100 ${
                    validationErrors.buyerEmail ? 'border-red-500' : 'border-slate-200'
                  }`} 
                />
                {checkingEmail && <p className="mt-1 text-xs text-slate-500">Checking email...</p>}
                {validationErrors.buyerEmail && <p className="mt-1 text-xs text-red-600">{validationErrors.buyerEmail}</p>}
                {existingEmailMessage && (
                  <p className="mt-2 text-sm text-green-800 bg-green-50 px-2 py-1 rounded">{existingEmailMessage}</p>
                )}
              </div>

              {!existingBuyerId && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <input 
                      type="password" 
                      value={buyerPassword} 
                      onChange={e => { setBuyerPassword(e.target.value); clearError('buyerPassword'); }} 
                      className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                        validationErrors.buyerPassword ? 'border-red-500' : 'border-slate-200'
                      }`} 
                    />
                    {validationErrors.buyerPassword && <p className="mt-1 text-xs text-red-600">{validationErrors.buyerPassword}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }} 
                      className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                        validationErrors.confirmPassword ? 'border-red-500' : 'border-slate-200'
                      }`} 
                    />
                    {validationErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{validationErrors.confirmPassword}</p>}
                  </div>
                </>
              )}
              {existingBuyerId && (
                <div className="col-span-2 bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-green-800">
                  Using existing account credentials. No password change needed.
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Original Price</label>
                <input type="number" value={selectedProperty.price} disabled className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 bg-slate-100 cursor-not-allowed" />
                <p className="mt-1 text-xs text-slate-500">Listed price (read-only)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Sold at Cost</label>
                <input 
                  type="number" 
                  value={soldPrice ?? ''} 
                  onChange={e => { setSoldPrice(e.target.value === '' ? undefined : Number(e.target.value)); clearError('soldPrice'); }} 
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.soldPrice ? 'border-red-500' : 'border-slate-200'
                  }`} 
                  placeholder="Enter sale price"
                />
                {validationErrors.soldPrice && <p className="mt-1 text-xs text-red-600">{validationErrors.soldPrice}</p>}
                <p className="mt-1 text-xs text-slate-500">Actual sale price</p>
              </div>

              {!existingBuyerId && (
                <div>
                  <label className="text-sm font-medium text-slate-700">OTP Code</label>
                  <div className="flex gap-2 mt-1">
                    <input 
                      value={enteredOtp} 
                      onChange={e => { setEnteredOtp(e.target.value); clearError('enteredOtp'); }} 
                      placeholder="Enter OTP from email" 
                      className={`w-full px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                        validationErrors.enteredOtp ? 'border-red-500' : 'border-slate-200'
                      }`} 
                    />
                    <button onClick={sendOtp} disabled={sendingOtp} className="px-3 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">{sendingOtp ? 'Sending...' : 'Send OTP'}</button>
                  </div>
                  {validationErrors.enteredOtp && <p className="mt-1 text-xs text-red-600">{validationErrors.enteredOtp}</p>}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeSellModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Cancel</button>
              <button onClick={verifyAndCreate} disabled={processingSell} className="px-4 py-2 bg-green-600 text-white rounded-lg">{processingSell ? 'Processing...' : 'Confirm Sale'}</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && propertyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white text-slate-900 rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Confirm Delete</h3>
            <p className="mt-3 text-slate-600">Are you sure you want to delete <span className="font-semibold text-slate-900">{propertyToDelete.name}</span>? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={cancelDelete} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Cancel</button>
              <button onClick={() => deleteProperty(propertyToDelete.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-lg w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Property</h2>
              <button onClick={closeEditModal} className="text-slate-700 hover:text-slate-900 font-medium">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Property Name</label>
                <input
                  value={editName}
                  onChange={e => { setEditName(e.target.value); clearError('editName'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editName ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editName && <p className="mt-1 text-xs text-red-600">{validationErrors.editName}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Category</label>
                <input
                  value={editCategory}
                  onChange={e => { setEditCategory(e.target.value); clearError('editCategory'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editCategory ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editCategory && <p className="mt-1 text-xs text-red-600">{validationErrors.editCategory}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Address</label>
                <input
                  value={editAddress}
                  onChange={e => { setEditAddress(e.target.value); clearError('editAddress'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editAddress ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editAddress && <p className="mt-1 text-xs text-red-600">{validationErrors.editAddress}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Price</label>
                <input
                  type="number"
                  value={editPrice ?? ''}
                  onChange={e => { setEditPrice(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editPrice'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editPrice ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editPrice && <p className="mt-1 text-xs text-red-600">{validationErrors.editPrice}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Bedrooms</label>
                <input
                  type="number"
                  value={editBedrooms ?? ''}
                  onChange={e => { setEditBedrooms(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editBedrooms'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editBedrooms ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editBedrooms && <p className="mt-1 text-xs text-red-600">{validationErrors.editBedrooms}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Bathrooms</label>
                <input
                  type="number"
                  value={editBathrooms ?? ''}
                  onChange={e => { setEditBathrooms(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editBathrooms'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editBathrooms ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editBathrooms && <p className="mt-1 text-xs text-red-600">{validationErrors.editBathrooms}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Sqft</label>
                <input
                  type="number"
                  value={editSqft ?? ''}
                  onChange={e => { setEditSqft(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editSqft'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editSqft ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editSqft && <p className="mt-1 text-xs text-red-600">{validationErrors.editSqft}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Year Built</label>
                <input
                  type="number"
                  value={editYearBuilt ?? ''}
                  onChange={e => { setEditYearBuilt(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editYearBuilt'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editYearBuilt ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editYearBuilt && <p className="mt-1 text-xs text-red-600">{validationErrors.editYearBuilt}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Parking Spaces</label>
                <input
                  type="number"
                  value={editParkingSpaces ?? ''}
                  onChange={e => { setEditParkingSpaces(e.target.value === '' ? undefined : Number(e.target.value)); clearError('editParkingSpaces'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editParkingSpaces ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editParkingSpaces && <p className="mt-1 text-xs text-red-600">{validationErrors.editParkingSpaces}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Features</label>
                <input
                  value={editFeaturesInput}
                  onChange={e => { setEditFeaturesInput(e.target.value); clearError('editFeatures'); }}
                  placeholder="Comma-separated features"
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editFeatures ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editFeatures && <p className="mt-1 text-xs text-red-600">{validationErrors.editFeatures}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => { setEditDescription(e.target.value); clearError('editDescription'); }}
                  rows={3}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 placeholder-slate-400 ${
                    validationErrors.editDescription ? 'border-red-500' : 'border-slate-200'
                  }`}  
                />
                {validationErrors.editDescription && <p className="mt-1 text-xs text-red-600">{validationErrors.editDescription}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Images</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {editImages.map((image, index) => (
                      <div key={image.id ?? index} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={image.url} alt={`Property image ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    {newImagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={preview} alt={`New upload ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewImageFiles(prev => prev.filter((_, i) => i !== index));
                            setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center justify-center h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const files = e.target.files;
                        if (!files) return;
                        const newFiles = Array.from(files);
                        setNewImageFiles(prev => [...prev, ...newFiles]);
                        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                        setNewImagePreviews(prev => [...prev, ...newPreviews]);
                      }}
                    />
                    <span className="text-sm">Upload new images</span>
                  </label>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Availability</label>
                <select
                  value={editAvailability}
                  onChange={e => { setEditAvailability(e.target.value); clearError('editAvailability'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 bg-white ${
                    validationErrors.editAvailability ? 'border-red-500' : 'border-slate-200'
                  }`}  
                >
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                {validationErrors.editAvailability && <p className="mt-1 text-xs text-red-600">{validationErrors.editAvailability}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={e => { setEditStatus(e.target.value); clearError('editStatus'); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-slate-800 bg-white ${
                    validationErrors.editStatus ? 'border-red-500' : 'border-slate-200'
                  }`}  
                >
                  <option value="">Select status</option>
                  <option value="For Sale">For Sale</option>
                  <option value="Rent">Rent</option>
                  <option value="Sold">Sold</option>
                </select>
                {validationErrors.editStatus && <p className="mt-1 text-xs text-red-600">{validationErrors.editStatus}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeEditModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Cancel</button>
              <button onClick={savePropertyEdits} disabled={savingEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{savingEdit ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white max-w-sm z-60 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}
    </>
  );
}
