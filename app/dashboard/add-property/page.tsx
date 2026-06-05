'use client';

import { useState } from 'react';
import { Camera, Plus, X, MapPin, Info, Ruler, Bed, Bath, Tag, ListChecks, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>(['']);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    status: 'For Sale',
    category: 'House',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    year_built: '',
    parking_spaces: '',
    city: '',
    address: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const totalImages = images.length + newFiles.length;
      
      if (totalImages > 5) {
        alert("Maximum 5 images allowed");
        return;
      }

      setImages(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addFeature = () => setFeatures([...features, '']);
  const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index));
  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert Property metadata
      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert([{
          name: formData.name,
          status: formData.status,
          category: formData.category,
          price: parseFloat(formData.price) || 0,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseInt(formData.bathrooms) || 0,
          sqft: parseFloat(formData.sqft) || 0,
          year_built: parseInt(formData.year_built) || null,
          parking_spaces: parseInt(formData.parking_spaces) || 0,
          city: formData.city,
          address: formData.address,
          description: formData.description,
          features: features.filter(f => f.trim() !== '')
        }])
        .select()
        .single();

      if (propError) throw propError;

      // 2. Upload Images to Storage and Insert into property_images table
      if (images.length > 0) {
        const uploadPromises = images.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${property.id}/${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath);

          return {
            property_id: property.id,
            url: publicUrl,
            position: index
          };
        });

        const imageData = await Promise.all(uploadPromises);
        const { error: imgTableError } = await supabase
          .from('property_images')
          .insert(imageData);

        if (imgTableError) throw imgTableError;
      }

      alert('Property listed successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error:', error.message);
      alert('Error adding property: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Add New Property</h1>
        <p className="text-slate-500 mt-2">Fill in the details below to list a new property.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Image Upload Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Property Images (Max 5)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {previews.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img src={img} alt="Property preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {previews.length < 5 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400">
                <Plus size={24} />
                <span className="text-xs mt-2 font-medium">Add Image</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </section>

        {/* Basic Information */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Info className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Property Name</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                type="text" 
                placeholder="e.g. Luxury Villa with Pool" 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option>For Sale</option>
                  <option>For Rent</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option>House</option>
                  <option>Office</option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Hostel</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Price ($)</label>
              <input 
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                type="number" 
                placeholder="0.00" 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Year Built</label>
                <input 
                  name="year_built"
                  value={formData.year_built}
                  onChange={handleInputChange}
                  type="number" 
                  placeholder="2024" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Parking Spaces</label>
                <input 
                  name="parking_spaces"
                  value={formData.parking_spaces}
                  onChange={handleInputChange}
                  type="number" 
                  placeholder="0" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Bed size={14}/> Beds</label>
                <input 
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  type="number" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Bath size={14}/> Baths</label>
                <input 
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  type="number" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Ruler size={14}/> Sq Ft</label>
                <input 
                  name="sqft"
                  value={formData.sqft}
                  onChange={handleInputChange}
                  type="number" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Location Details</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">City</label>
              <input 
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                type="text" 
                placeholder="Enter city" 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Complete Address</label>
              <textarea 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows={3} 
                placeholder="Full street address, postal code, etc." 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </section>

        {/* Features & Amenities (Bullet Points) */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ListChecks className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Features & Amenities</h2>
            </div>
            <button 
              type="button"
              onClick={addFeature}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Point
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="flex gap-2">
                <input 
                  type="text" 
                  value={feature}
                  onChange={(e) => updateFeature(idx, e.target.value)}
                  placeholder={`Feature ${idx + 1} (e.g. Free Wi-Fi, Gym)`} 
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                />
                <button 
                  type="button"
                  onClick={() => removeFeature(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Description Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Detailed Description</h2>
          </div>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={6} 
            placeholder="Describe the property in detail. Highlight unique selling points..." 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          ></textarea>
        </section>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button 
            type="submit" 
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : "Publish Property"}
          </button>
          <button 
            type="button" 
            className="px-8 bg-slate-100 text-slate-600 font-semibold py-4 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
          >
            Save as Draft
          </button>
        </div>
      </form>
    </div>
  );
}
