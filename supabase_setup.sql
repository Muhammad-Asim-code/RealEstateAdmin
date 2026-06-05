-- 1. Create Properties table
CREATE TABLE properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'For Sale', 'For Rent'
    category TEXT NOT NULL, -- 'House', 'Office', etc.
    price DECIMAL(12, 2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    sqft DECIMAL(10, 2),
    year_built INTEGER,
    parking_spaces INTEGER,
    city TEXT,
    address TEXT,
    description TEXT,
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Property Images table
CREATE TABLE property_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Assuming public access for now for simplicity, but strictly restricted in production)
CREATE POLICY "Public Read Access" ON properties FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON properties FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access" ON property_images FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON property_images FOR INSERT WITH CHECK (true);

-- 5. Storage Setup: Note that you need to manually create a bucket named 'property-images' in Supabase dashboard
-- and set its access to 'Public' if you want direct URL access.
