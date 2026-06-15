-- Executar no SQL Editor do Supabase para criar a tabela das viaturas

CREATE TABLE public.vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  price text,
  image text,
  description text,
  original_url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar Row Level Security (RLS) para permitir leitura pública mas proteger as escritas
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos podem ver as viaturas (Leitura pública para o site)
CREATE POLICY "Permitir leitura a todos" 
ON public.vehicles FOR SELECT 
USING (true);

-- Política 2: Inserir (No caso real, deve restringir apenas a Admin, mas para testar vamos deixar aberto)
CREATE POLICY "Permitir inserir" 
ON public.vehicles FOR INSERT 
WITH CHECK (true);

-- Política 3: Apagar (Mesma lógica, aberto para teste inicial)
CREATE POLICY "Permitir apagar" 
ON public.vehicles FOR DELETE 
USING (true);
