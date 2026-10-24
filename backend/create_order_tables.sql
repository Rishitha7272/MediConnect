-- ============================================================
-- Create order-related tables for Pharmacy & Lab Test features
-- Tables: medicine_orders, lab_bookings, lab_receipts
-- ============================================================

-- 1. Medicine Orders Table
CREATE TABLE IF NOT EXISTS public.medicine_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Placed' CHECK (status IN ('Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Lab Bookings Table
CREATE TABLE IF NOT EXISTS public.lab_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    booking_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'sample_collected', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lab Receipts Table
CREATE TABLE IF NOT EXISTS public.lab_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE public.medicine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for medicine_orders
-- ============================================================

-- Patients can INSERT their own orders
CREATE POLICY "Patients can create their own medicine orders"
    ON public.medicine_orders FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

-- Patients can SELECT their own orders
CREATE POLICY "Patients can view their own medicine orders"
    ON public.medicine_orders FOR SELECT
    USING (auth.uid() = patient_id);

-- Patients can UPDATE their own orders (e.g. cancel)
CREATE POLICY "Patients can update their own medicine orders"
    ON public.medicine_orders FOR UPDATE
    USING (auth.uid() = patient_id);

-- ============================================================
-- RLS Policies for lab_bookings
-- ============================================================

-- Patients can INSERT their own lab bookings
CREATE POLICY "Patients can create their own lab bookings"
    ON public.lab_bookings FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

-- Patients can SELECT their own lab bookings
CREATE POLICY "Patients can view their own lab bookings"
    ON public.lab_bookings FOR SELECT
    USING (auth.uid() = patient_id);

-- ============================================================
-- RLS Policies for lab_receipts
-- ============================================================

-- Patients can INSERT their own lab receipts
CREATE POLICY "Patients can create their own lab receipts"
    ON public.lab_receipts FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

-- Patients can SELECT their own lab receipts
CREATE POLICY "Patients can view their own lab receipts"
    ON public.lab_receipts FOR SELECT
    USING (auth.uid() = patient_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_medicine_orders_patient_id ON public.medicine_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_status ON public.medicine_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_patient_id ON public.lab_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_receipts_patient_id ON public.lab_receipts(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_receipts_transaction_id ON public.lab_receipts(transaction_id);
