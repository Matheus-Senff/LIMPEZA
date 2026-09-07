export type ServiceCode =
  | 'CLEANING'
  | 'HEAVY_CLEANING'
  | 'PRE_MOVING_CLEANING'
  | 'POST_WORK_CLEANING'
  | 'BUSINESS_CLEANING'
  | 'IRONING'
  | 'FURNITURE_ASSEMBLY'
  | 'HOME_ASSISTANCE';

export type Cor = 'azul' | 'verde' | 'vermelho' | 'amarelo';

export interface Servico {
  code: ServiceCode;
  slug: string;
  nome: string;
  nomeCurto: string;
  chamada: string;
  descricao: string;
  disponibilidade: 'hoje' | 'amanha';
  trazProdutos: boolean;
  minMinutos: number;
  sugeridoMinutos: number;
  maxMinutos: number;
  cor: Cor;
  publico: 'lar' | 'empresa';
  incluso: string[];
  naoIncluso: string[];
}

export const SERVICOS: Servico[] = [
  {
    code: 'CLEANING',
    slug: 'padrao',
    nome: 'Limpeza Padrão',
    nomeCurto: 'Limpeza\nPadrão',
    chamada: 'Limpeza na medida certa para as necessidades do dia a dia',
    descricao:
      'A Limpeza Padrão tem a quantidade de horas e as tarefas ideais para manter a sua rotina em ordem.',
    disponibilidade: 'hoje',
    trazProdutos: false,
    minMinutos: 210,
    sugeridoMinutos: 240,
    maxMinutos: 480,
    cor: 'azul',
    publico: 'lar',
    incluso: [
      'Varrer, aspirar e passar pano em todos os cômodos contratados',
      'Limpeza completa de banheiros',
      'Cozinha: pia, fogão, bancada e parte externa dos armários',
      'Tirar o pó de móveis e superfícies',
      'Arrumar camas com roupa de cama limpa disponível',
      'Recolher o lixo',
    ],
    naoIncluso: [
      'Limpeza de vidros externos ou em altura',
      'Cuidado com crianças, idosos ou animais',
      'Mover móveis pesados',
    ],
  },
  {
    code: 'HEAVY_CLEANING',
    slug: 'pesada',
    nome: 'Limpeza Pesada',
    nomeCurto: 'Limpeza\nPesada',
    chamada: 'Limpeza com tudo que seu lar precisa para ficar brilhando',
    descricao:
      'Limpeza profunda, para quando a casa precisa de mais do que a manutenção do dia a dia. O profissional leva os produtos.',
    disponibilidade: 'hoje',
    trazProdutos: true,
    minMinutos: 240,
    sugeridoMinutos: 360,
    maxMinutos: 600,
    cor: 'verde',
    publico: 'lar',
    incluso: [
      'Tudo da Limpeza Padrão',
      'Produtos de limpeza inclusos',
      'Rodapés, portas e interruptores',
      'Azulejos e box do banheiro com remoção de encardido',
      'Atrás e embaixo de móveis leves',
    ],
    naoIncluso: ['Limpeza pós-obra', 'Lavagem de estofados com máquina', 'Vidros em altura'],
  },
  {
    code: 'IRONING',
    slug: 'passar-roupa',
    nome: 'Passadoria de Roupas',
    nomeCurto: 'Passadoria\nde Roupas',
    chamada: 'Suas roupas bem passadas, cuidadas e dobradas',
    descricao:
      'Um profissional dedicado só a passar, dobrar e organizar as suas roupas pelo tempo que você contratar.',
    disponibilidade: 'hoje',
    trazProdutos: false,
    minMinutos: 120,
    sugeridoMinutos: 180,
    maxMinutos: 480,
    cor: 'amarelo',
    publico: 'lar',
    incluso: [
      'Passar as peças separadas por você',
      'Dobrar e organizar',
      'Pendurar o que não pode ser dobrado',
    ],
    naoIncluso: ['Lavagem das peças', 'Costura ou ajustes', 'Passar peças delicadas sem instrução'],
  },
  {
    code: 'FURNITURE_ASSEMBLY',
    slug: 'montagem-de-moveis',
    nome: 'Montagem de Móveis',
    nomeCurto: 'Montagem\nde móveis',
    chamada: 'Montadores qualificados para montar todo tipo de móvel',
    descricao:
      'Montadores com ferramental próprio para armários, guarda-roupas, camas, estantes e escritório.',
    disponibilidade: 'amanha',
    trazProdutos: false,
    minMinutos: 120,
    sugeridoMinutos: 180,
    maxMinutos: 480,
    cor: 'vermelho',
    publico: 'lar',
    incluso: [
      'Montagem com ferramentas próprias',
      'Conferência das peças antes de começar',
      'Recolhimento das embalagens',
    ],
    naoIncluso: ['Furação de parede estrutural', 'Instalação elétrica', 'Peças faltantes do fabricante'],
  },
  {
    code: 'PRE_MOVING_CLEANING',
    slug: 'pre-mudanca',
    nome: 'Limpeza Pré-mudança',
    nomeCurto: 'Limpeza\nPré-mudança',
    chamada: 'Seu imóvel limpo e pronto para a chegada ao novo lar',
    descricao:
      'Para imóvel vazio, antes de a mudança entrar. O profissional leva os produtos.',
    disponibilidade: 'amanha',
    trazProdutos: true,
    minMinutos: 240,
    sugeridoMinutos: 360,
    maxMinutos: 600,
    cor: 'verde',
    publico: 'lar',
    incluso: [
      'Limpeza profunda com o imóvel vazio',
      'Interior de armários embutidos',
      'Janelas pelo lado interno',
      'Produtos inclusos',
    ],
    naoIncluso: ['Remoção de entulho de obra', 'Limpeza de fachada'],
  },
  {
    code: 'POST_WORK_CLEANING',
    slug: 'pos-obra',
    nome: 'Limpeza Pós-obra',
    nomeCurto: 'Limpeza\nPós-obra',
    chamada: 'Serviço especializado para imóveis recém reformados',
    descricao:
      'Remoção de poeira fina, respingos de tinta e resíduos leves de construção.',
    disponibilidade: 'amanha',
    trazProdutos: false,
    minMinutos: 360,
    sugeridoMinutos: 480,
    maxMinutos: 720,
    cor: 'amarelo',
    publico: 'lar',
    incluso: [
      'Remoção de poeira fina de todas as superfícies',
      'Respingos de tinta, gesso e cimento em pisos',
      'Limpeza de janelas e esquadrias pelo lado interno',
    ],
    naoIncluso: ['Retirada de entulho pesado', 'Trabalho em altura', 'Uso de produtos ácidos fortes'],
  },
  {
    code: 'BUSINESS_CLEANING',
    slug: 'comercial',
    nome: 'Limpeza Comercial',
    nomeCurto: 'Limpeza\nComercial',
    chamada: 'Para escritórios, consultórios, lojas e salas comerciais',
    descricao:
      'Atendimento para empresas, com nota fiscal e possibilidade de contrato recorrente.',
    disponibilidade: 'hoje',
    trazProdutos: false,
    minMinutos: 180,
    sugeridoMinutos: 240,
    maxMinutos: 600,
    cor: 'azul',
    publico: 'empresa',
    incluso: [
      'Limpeza de estações de trabalho e áreas comuns',
      'Banheiros e copa',
      'Recolhimento de lixo e reposição de descartáveis fornecidos',
    ],
    naoIncluso: ['Limpeza de fachada', 'Serviços em altura', 'Manutenção predial'],
  },
  {
    code: 'HOME_ASSISTANCE',
    slug: 'assistencia',
    nome: 'Assistência Residencial',
    nomeCurto: 'Assistência\nResidencial',
    chamada: 'Encanador, eletricista, chaveiro, vidraceiro e mais',
    descricao:
      'Emergência doméstica resolvida com profissional credenciado. Grátis para assinantes, avulso para quem precisar.',
    disponibilidade: 'amanha',
    trazProdutos: false,
    minMinutos: 60,
    sugeridoMinutos: 60,
    maxMinutos: 240,
    cor: 'vermelho',
    publico: 'lar',
    incluso: ['Visita técnica', 'Diagnóstico do problema', 'Reparo emergencial de pequeno porte'],
    naoIncluso: ['Peças e materiais', 'Obras estruturais', 'Projetos e ART'],
  },
];

export const porSlug = (slug: string) => SERVICOS.find((s) => s.slug === slug);
export const porCodigo = (code: ServiceCode) => SERVICOS.find((s) => s.code === code);

export interface Opcional {
  code: string;
  nome: string;
  minutos: number;
  servicos: ServiceCode[];
}

export const OPCIONAIS: Opcional[] = [
  { code: 'REFRIGERATOR', nome: 'Interior da geladeira', minutos: 30, servicos: ['CLEANING', 'HEAVY_CLEANING', 'PRE_MOVING_CLEANING', 'POST_WORK_CLEANING'] },
  { code: 'VACCUM_CARPET', nome: 'Aspirar tapete ou estofado', minutos: 30, servicos: ['CLEANING', 'HEAVY_CLEANING'] },
  { code: 'WASH_WINDOWS', nome: 'Interior de janelas', minutos: 60, servicos: ['CLEANING', 'HEAVY_CLEANING', 'PRE_MOVING_CLEANING', 'POST_WORK_CLEANING', 'BUSINESS_CLEANING'] },
  { code: 'CLEANUP_CABINETS', nome: 'Interior de armário de cozinha', minutos: 60, servicos: ['CLEANING', 'HEAVY_CLEANING', 'PRE_MOVING_CLEANING'] },
  { code: 'LAUNDRY', nome: 'Lavar roupas', minutos: 60, servicos: ['CLEANING', 'HEAVY_CLEANING'] },
  { code: 'CLEANUP_EXTERNAL', nome: 'Área externa (até 20 m²)', minutos: 120, servicos: ['CLEANING', 'HEAVY_CLEANING', 'POST_WORK_CLEANING'] },
  { code: 'IRONING_ADDON', nome: 'Passadoria de roupas', minutos: 120, servicos: ['CLEANING', 'HEAVY_CLEANING'] },
];

export const PLANOS = [
  {
    code: 'SINGLE' as const,
    titulo: 'Serviço avulso',
    subtitulo: 'Diária única',
    selo: null,
    beneficios: [
      'Profissionais com o selo de aprovação',
      'Seguro para o profissional',
      'Atendimento via chat',
    ],
    ausentes: ['Profissional recorrente', 'Prioridade na agenda', 'Assistência Residencial'],
    assistencia: null,
  },
  {
    code: 'WEEKLY' as const,
    titulo: 'Assinatura',
    subtitulo: 'Semanal',
    selo: 'Até 20% OFF',
    beneficios: [
      'Profissionais aprovados e mais experientes',
      'Seguro para o profissional',
      'Profissional recorrente',
      'Prioridade na agenda',
      'Atendimento por WhatsApp',
    ],
    ausentes: [],
    assistencia: 'Assistência Residencial completa',
  },
  {
    code: 'BIWEEKLY' as const,
    titulo: 'Assinatura',
    subtitulo: 'Quinzenal',
    selo: 'Até 15% OFF',
    beneficios: [
      'Profissionais aprovados e mais experientes',
      'Seguro para o profissional',
      'Profissional recorrente',
      'Prioridade na agenda',
      'Atendimento por WhatsApp',
    ],
    ausentes: [],
    assistencia: 'Assistência Residencial básica',
  },
  {
    code: 'MONTHLY' as const,
    titulo: 'Assinatura',
    subtitulo: 'Mensal',
    selo: 'Até 7% OFF',
    beneficios: [
      'Profissionais aprovados e mais experientes',
      'Seguro para o profissional',
      'Profissional recorrente',
      'Prioridade na agenda',
      'Atendimento por WhatsApp',
    ],
    ausentes: [],
    assistencia: 'Assistência Residencial',
  },
];

export type FrequencyCode = (typeof PLANOS)[number]['code'];

export const CORES: Record<Cor, { bg: string; texto: string; borda: string; solido: string }> = {
  azul: { bg: 'bg-azul-50', texto: 'text-azul-700', borda: 'border-azul-200', solido: 'bg-azul-600' },
  verde: { bg: 'bg-verde-50', texto: 'text-verde-700', borda: 'border-verde-100', solido: 'bg-verde-600' },
  vermelho: { bg: 'bg-vermelho-50', texto: 'text-vermelho-700', borda: 'border-vermelho-100', solido: 'bg-vermelho-600' },
  amarelo: { bg: 'bg-amarelo-50', texto: 'text-amarelo-700', borda: 'border-amarelo-100', solido: 'bg-amarelo-400' },
};

export const reais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const horas = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};
