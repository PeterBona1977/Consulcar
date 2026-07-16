-- 1. Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'sales')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Service role can do everything, so no strict policy needed for admin API routes 
-- but let's allow authenticated users to read their own role
CREATE POLICY "Permitir leitura da propria role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Add user_id to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add vehicle_id to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- 4. Set the existing user pv1320867@gmail.com to super_admin
DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'pv1320867@gmail.com' LIMIT 1;
    
    IF super_admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (super_admin_id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
    END IF;
END $$;
