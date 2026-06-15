-- Executar no SQL Editor do Supabase para criar a tabela de conteúdos (CMS)

CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{
    "logoText": "Consulcar",
    "heroTitle1": "O teu próximo carro,",
    "heroTitle2": "sem fronteiras.",
    "heroDescription": "Especialistas em consultoria e importação automóvel. Tratamos de toda a pesquisa, negociação, transporte e legalização para que só tenhas de te preocupar em conduzir.",
    "heroBtnPrimary": "Iniciar Pedido",
    "heroBtnSecondary": "Saber Mais",
    "aboutTitle1": "Como",
    "aboutTitle2": "Funciona",
    "aboutSubtitle": "Um serviço premium, transparente e focado nas tuas necessidades.",
    "footerText": "© 2026 Consulcar. Todos os direitos reservados."
  }'::jsonb
);

-- Ativar RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos podem ler as configurações
CREATE POLICY "Permitir leitura a todos" 
ON public.site_settings FOR SELECT 
USING (true);

-- Política 2: Permitir atualização
CREATE POLICY "Permitir atualizacao" 
ON public.site_settings FOR UPDATE 
USING (true);

-- Inserir a linha inicial (se não existir)
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
