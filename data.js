/* ============================================================
   data.js — IDENTIDADE E CONTEÚDO DO EVENTO
   Jornada dos Graus Maçônicos Aliados (AMD) · 30 e 31 de outubro de 2026

   Este site é NEUTRO: não mostra local nem endereço. Não acrescente
   LOCATIONS nem "loc" nas sessões.

   ATENÇÃO: repositório público — nunca coloque aqui link de convite
   de WhatsApp, telefone pessoal ou senha.
   ============================================================ */

const SITE_CONFIG = {
  siteUrl: 'https://viaveritasvita.github.io/amdjornada26/',
  shortUrl: 'https://viaveritasvita.github.io/amdjornada26/',
  sheetProgramacaoCsvUrl: 'COLE_AQUI_A_URL_CSV_DA_ABA_PROGRAMACAO',
  sheetAvisosCsvUrl: 'COLE_AQUI_A_URL_CSV_DA_ABA_AVISOS',
  icsFeedUrl: '',
  oneSignalAppId: '',
};

const EVENT_INFO = {
  bodies: 'Jornada dos Graus Maçônicos Aliados',
  city: '',
  tz: 'America/Sao_Paulo',
  utcOffset: '-03:00',
  officialStart: '2026-10-30',
  openingISO: '2026-10-30T20:10:00-03:00',
  secretariatEmail: '',
  emergencyTel: '',
  emergencyDisplay: '',
};

/* Sem locais neste evento (site neutro). */
const LOCATIONS = {};

/* ---------- CORPOS / GRAUS ----------
   "geral" (sem selo) e "log" (logística) são reservados pelo motor. */
const BODIES = {
  amd:        { label: 'Graus Maçônicos Aliados', color: '#8a6828' },
  instalacao: { label: 'Cerimônia complementar', color: '#16294e' },
  geral:      { label: '', color: '#566072' },
  log:        { label: '', color: '#64748b' },
};

const SCHEDULE = [
  {
    date: '2026-10-30',
    weekday: 'fri',
    official: true,
    sessions: [
      { id: 's30-1', start: '20:10', end: '20:50', body: 'amd',
        t: { pt: 'São Lourenço, o Mártir' } },
      { id: 's30-2', start: '21:00', end: '21:45', body: 'amd',
        t: { pt: 'Cavaleiro de Constantinopla' } },
    ],
  },
  {
    date: '2026-10-31',
    weekday: 'sat',
    official: true,
    sessions: [
      { id: 's31-1', start: '08:00', end: '08:50', body: 'amd',
        t: { pt: 'Arquiteto' } },
      { id: 's31-2', start: '09:00', end: '09:50', body: 'amd',
        t: { pt: 'Grande Arquiteto' } },
      { id: 's31-3', start: '10:05', end: '10:55', body: 'amd',
        t: { pt: 'Superintendente' } },
      { id: 's31-4', start: '11:10', end: '12:20', body: 'amd',
        t: { pt: 'Mestres de Tiro' } },
      { id: 's31-5', start: '13:30', end: '14:50', body: 'amd',
        t: { pt: 'Cruz Vermelha da Babilônia' } },
      { id: 's31-6', start: '15:05', end: '15:55', body: 'amd',
        t: { pt: 'Grandes Cobridores de Salomão' } },
      { id: 's31-7', start: '16:10', end: '17:15', body: 'amd',
        t: { pt: 'Santa Ordem Sacerdotal de Grande Sumo Sacerdote' } },
      { id: 's31-8', start: '17:35', end: '19:35', body: 'instalacao',
        t: { pt: 'Instalação dos 10 Soberanos Mestres' },
        note: { pt: 'Ao todo, 9 graus e 1 cerimônia de instalação.\nNão estão incluídos nesta Jornada:\n- Antiga Ordem das Rolhas\n- Antigo Monitor de Jonas\n- Ordem de São Patrício\n- Ordem Real do Ramo Vermelho d\'Eri' } },
    ],
  },
];
