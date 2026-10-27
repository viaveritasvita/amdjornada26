/* ============================================================
   refeicoes-config.js — TUDO O QUE SE EDITA NA PÁGINA DO ÁGAPE
   Jornada dos Graus Maçônicos Aliados (AMD) · 30 e 31/10/2026

   Site NEUTRO: não ponha aqui local, endereço nem cidade.
   ATENÇÃO: repositório público. Use só chave Pix ALEATÓRIA.
   ============================================================ */

const REFEICOES_CONFIG = {
  /* URL /exec do Apps Script da planilha do Ágape AMD.
     Enquanto começar com COLE_, o site gera o Pix mas não grava pedidos. */
  apiUrl: 'https://script.google.com/macros/s/AKfycbysRhOeeiV94jhC5gsAttny6O5zQ0BhGs4Cqo9q6_kjbXd275V8UWEQ9wTkygiNyY8Wdg/exec',

  /* Recebedor do Pix.
     nome: até 25 letras, sem acento, como está no banco.
     cidade: só vai dentro do código Pix (não aparece na página). */
  pix: {
    chave: 'f5f765c7-b4d4-45db-893b-1e6382298539', // chave aleatória
    nome: 'LUCIANO DE OLIVEIRA NUNES',
    cidade: 'RIO DE JANEIRO',
    banco: 'Nubank',
    titular: 'Ir. Luciano de Oliveira Nunes',
  },

  /* WhatsApp de quem recebe os comprovantes (55 + DDD + número, só dígitos).
     Vazio = os botões de WhatsApp somem. */
  tesoureiro: {
    nome: 'Ir. Luciano',
    whatsapp: '556599819296',
  },

  /* Opções de alimentação (uma por pedido). */
  opcoes: [
    { id: 'amd', nome: 'Jornada AMD', detalhe: '30 e 31 de outubro de 2026', valor: 120 },
    { id: 'tres', nome: 'Três eventos: AMD + OSM + RCC', detalhe: '30 e 31/10, 21/11 e 12/12/2026', valor: 360 },
  ],

  /* Cardápio (só exibição). Cada bloco: título, quando e os pratos;
     "sobremesas" e "bebidas" são opcionais. */
  cardapio: [
    {
      titulo: 'Jantar', quando: 'Sexta-feira, 30/10',
      pratos: ['Lagarto ao molho madeira', 'Arroz branco', 'Batata palha', 'Farofa de uvas-passas e castanhas', 'Salada verde', 'Maionese'],
      sobremesas: ['Pudim de leite condensado', 'Cheesecake de uvas verdes'],
      bebidas: 'Refrigerantes normais e zero (Coca-Cola, Fanta e Guaraná Antarctica)',
    },
    {
      titulo: 'Café da manhã', quando: 'Sábado, 31/10',
      pratos: ['Salada de frutas', 'Café preto com e sem açúcar', 'Leite', 'Chá-mate', 'Suco natural de laranja', 'Dois tipos de bolo', 'Sanduíche de queijo e presunto no pão baguete', 'Bolos de queijo e de arroz'],
    },
    {
      titulo: 'Almoço', quando: 'Sábado, 31/10',
      pratos: ['Lasanha de costela', 'Nhoque ao sugo', 'Arroz branco', 'Salada verde com legumes cozidos'],
      sobremesas: ['Pavê de doce de leite', 'Mousse de maracujá'],
      bebidas: 'Refrigerantes normais e zero',
    },
    {
      titulo: 'Jantar', quando: 'Sábado, 31/10',
      pratos: ['Frango xadrez', 'Arroz branco', 'Batata palha', 'Salada verde e legumes cozidos'],
      sobremesas: ['Pudim de leite condensado', 'Gelatina colorida'],
      bebidas: 'Refrigerantes normais e zero',
    },
  ],
  cardapioNota: 'Bebidas não alcoólicas incluídas em todas as refeições.',

  /* Prazo de pagamento informado aos irmãos: até 28/10.
     Depois disso a página mostra "pedidos encerrados". */
  encerraEm: '2026-10-28T23:59:00-03:00',
};
