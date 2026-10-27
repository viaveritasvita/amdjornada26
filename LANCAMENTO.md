# Lançamento — Ágape da Jornada AMD

Site: `https://viaveritasvita.github.io/amdjornada26/` · 30 e 31 de outubro de 2026

| Página | Endereço |
|---|---|
| Ágape (entrada) | `/amdjornada26/` |
| Programação | `/amdjornada26/programacao.html` |
| Painel (com senha) | `/amdjornada26/painel.html` |

Site neutro: sem local, endereço ou cidade em nenhuma página.

## O que se edita
- `refeicoes-config.js`: opções e valores, chave Pix, nome do titular, WhatsApp de quem recebe os comprovantes, prazo (`encerraEm`).
- `data.js`: horários e graus da programação.
- Depois de mudar código (`refeicoes.js`, `.css`, `.html`), suba o `CACHE` em `sw.js`.

## Conferência
Cada pedido tem um código `AM…` e centavos únicos no valor (ex.: R$ 120,37).
No extrato, o valor já identifica o pedido. A aba **Resumo** da planilha traz os totais.
O Status vira **Confirmado** pelo menu da planilha (ou pela ação `confirmar`, com a senha do painel).