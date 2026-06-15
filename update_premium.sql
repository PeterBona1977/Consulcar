UPDATE public.site_settings 
SET data = '{
  "theme": {
    "primaryColor": "#3b82f6",
    "secondaryColor": "#8b5cf6",
    "backgroundColor": "#050505",
    "textColor": "#ffffff"
  },
  "header": { "logoText": "Consulcar" },
  "footer": { "footerText": "© 2026 Consulcar. Todos os direitos reservados." },
  "sections": [
    { 
      "id": "hero-1", 
      "type": "hero", 
      "menuLabel": "",
      "title1": "O teu próximo carro,", 
      "title2": "sem fronteiras.", 
      "description": "Especialistas em consultoria e importação automóvel premium. Tratamos de toda a pesquisa, negociação, transporte e legalização para que só tenhas de te preocupar em conduzir.", 
      "btnPrimary": "Iniciar Pedido", 
      "btnSecondary": "Saber Mais",
      "bgImage": "https://images.unsplash.com/photo-1503376710356-7386c7d23fcd?q=80&w=2000&auto=format&fit=crop",
      "bgColor": "transparent",
      "bgStyle": "cover",
      "visible": true 
    },
    { 
      "id": "viaturas-1", 
      "type": "viaturas", 
      "menuLabel": "Stock",
      "title1": "Viaturas", 
      "title2": "Em Destaque", 
      "subtitle": "Oportunidades exclusivas selecionadas pela nossa equipa de especialistas.", 
      "bgImage": "",
      "bgColor": "transparent",
      "bgStyle": "cover",
      "visible": true 
    },
    { 
      "id": "about-1", 
      "type": "about", 
      "menuLabel": "O Serviço",
      "title1": "Como", 
      "title2": "Funciona", 
      "subtitle": "Um serviço de excelência, transparente e totalmente focado nas tuas necessidades.", 
      "bgImage": "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=2000&auto=format&fit=crop",
      "bgColor": "transparent",
      "bgStyle": "cover",
      "visible": true 
    },
    {
      "id": "testimonials-1",
      "type": "testimonials",
      "menuLabel": "Testemunhos",
      "title1": "O que dizem os",
      "title2": "Nossos Clientes",
      "subtitle": "A confiança e satisfação de quem já comprou connosco.",
      "client1": "João Silva",
      "review1": "Processo super transparente. O meu Porsche chegou impecável e trataram de toda a burocracia do ISV. Recomendo a 100%.",
      "client2": "Marta Teixeira",
      "review2": "Nunca pensei que importar um carro da Alemanha fosse tão fácil. A equipa da Consulcar esteve sempre presente.",
      "client3": "Rui Pedro",
      "review3": "Excelente acompanhamento desde a procura até à entrega à porta de casa. Profissionalismo de topo.",
      "bgImage": "",
      "bgColor": "transparent",
      "bgStyle": "cover",
      "visible": true
    },
    { 
      "id": "contact-1", 
      "type": "contact", 
      "menuLabel": "Fazer Pedido",
      "title1": "Encontra o teu", 
      "title2": "Automóvel", 
      "subtitle": "Preenche o formulário abaixo com os detalhes da viatura que pretendes.", 
      "bgImage": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=2000&auto=format&fit=crop",
      "bgColor": "transparent",
      "bgStyle": "cover",
      "visible": true 
    }
  ]
}'::jsonb
WHERE id = 1;
