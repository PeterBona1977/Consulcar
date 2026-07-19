-- 1. Update user_roles to add is_active
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- 2. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    profile_image text,
    cover_image text,
    phone text,
    biography text,
    history text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read profiles
CREATE POLICY "Permitir leitura a todos nos perfis" 
ON public.user_profiles FOR SELECT 
USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Permitir atualizacao do proprio perfil" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Permitir inserir o proprio perfil" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. Update vehicles table to prevent deleting users with vehicles
-- First, drop the existing constraint. We need to find its name. Usually it's vehicles_user_id_fkey.
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey;

-- Then re-add it with RESTRICT so that we can't delete a user if they have vehicles
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
