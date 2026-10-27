/* ============================================================
   AppsScript-refeicoes.gs — pedidos do ágape (AMD)
   Jornada dos Graus Maçônicos Aliados · 30 e 31/10/2026

   - POST {acao:'registrar'}  → cria/atualiza o pedido ("Pix gerado")
                                 e devolve os centavos de identificação.
   - POST {acao:'pago'}       → "Pagamento informado".
   - POST {acao:'comprovante'}→ salva foto/PDF no Drive e liga ao pedido.
   - POST {acao:'confirmar', chave, itens:[{codigo, obs}]} → "Confirmado".
   - POST {acao:'remover', chave, codigos:[...]} → apaga linhas de teste.
   - GET ?acao=status&codigo=AM…  → status do pedido (para a página).
   - GET ?acao=listar&chave=SENHA → tudo, para o painel.html.
   ============================================================ */

/* Senha do painel.html — fica só aqui no Apps Script, nunca no GitHub. */
const CHAVE_PAINEL = 'TROQUE-ESTA-SENHA';

const ABA = 'Pedidos';
const CABECALHO = [
  'Código', 'Status', 'Criado em', 'Pagamento informado em', 'Confirmado em',
  'Irmão', 'WhatsApp', 'Loja ou Conselho', 'Opção',
  'Valor (R$)', 'Centavos de identificação',
  'Titular da conta do Pix', 'Banco do Pix', 'Comprovante', 'Observação do tesoureiro',
];
const COL = Object.fromEntries(CABECALHO.map((h, i) => [h, i + 1]));
const STATUS = ['Pix gerado', 'Pagamento informado', 'Confirmado', 'Não localizado', 'Cancelado'];
const CODIGO = /^AM[A-Z0-9]{6}$/;

/* Rode UMA VEZ (Executar → configurar). Rodar de novo é seguro. */
function configurar() {
  pastaComprovantes_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');
  let sh = ss.getSheetByName(ABA);
  if (!sh) sh = ss.insertSheet(ABA, 0);
  sh.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO])
    .setFontWeight('bold').setBackground('#101f3c').setFontColor('#e9cd85');
  sh.setFrozenRows(1);
  const regra = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build();
  sh.getRange(2, COL['Status'], 1000, 1).setDataValidation(regra);
  sh.getRange(2, COL['Valor (R$)'], 1000, 1).setNumberFormat('"R$" #,##0.00');
  sh.getRange(2, COL['Centavos de identificação'], 1000, 1).setNumberFormat('"R$" 0.00');
  sh.getRange(2, COL['WhatsApp'], 1000, 1).setNumberFormat('@');
  const faixa = sh.getRange(2, 1, 1000, CABECALHO.length);
  const f = (txt, cor) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="' + txt + '"').setBackground(cor).setRanges([faixa]).build();
  sh.setConditionalFormatRules([
    f('Confirmado', '#e3f1e6'),
    f('Pagamento informado', '#fdf3d8'),
    f('Não localizado', '#f7e0e0'),
    f('Cancelado', '#eeeeee'),
  ]);
  montarResumo_(ss);
}

/* Aba "Resumo" (fórmulas vivas). */
function montarResumo_(ss) {
  let r = ss.getSheetByName('Resumo');
  if (!r) r = ss.insertSheet('Resumo');
  r.clear();
  const p = "'" + ABA + "'!";
  const col = function (h) { const l = letra_(COL[h]); return p + l + '2:' + l; };
  const st = col('Status'), op = col('Opção'), vl = col('Valor (R$)');
  const linhas = [
    ['Resumo dos pedidos', ''],
    ['Pedidos (exceto cancelados)', '=COUNTIFS(' + col('Código') + ',"<>",' + st + ',"<>Cancelado")'],
    ['Só Jornada AMD', '=COUNTIFS(' + op + ',"Jornada AMD",' + st + ',"<>Cancelado")'],
    ['Três eventos (AMD + OSM + RCC)', '=COUNTIFS(' + op + ',"Três eventos*",' + st + ',"<>Cancelado")'],
    ['Valor total (R$)', '=SUMIFS(' + vl + ',' + st + ',"<>Cancelado")'],
    ['Valor confirmado (R$)', '=SUMIFS(' + vl + ',' + st + ',"Confirmado")'],
    ['Aguardando conferência (R$)', '=SUMIFS(' + vl + ',' + st + ',"Pagamento informado")'],
    ['Pix gerado sem aviso de pagamento', '=COUNTIFS(' + st + ',"Pix gerado")'],
  ];
  r.getRange(1, 1, linhas.length, 2).setValues(linhas);
  r.getRange('A1').setFontWeight('bold').setFontSize(13);
  r.getRange('B5:B7').setNumberFormat('"R$" #,##0.00');
  r.setColumnWidth(1, 280);
}

/* ---------------- entrada pela página ---------------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA);
    garantirCabecalho_(sh);
    const agora = new Date();

    if (d.acao === 'confirmar' || d.acao === 'remover') {
      if (d.chave !== CHAVE_PAINEL || CHAVE_PAINEL === 'TROQUE-ESTA-SENHA') return json_({ ok: false, erro: 'senha incorreta' });
      if (d.acao === 'remover') {
        const removidos = [];
        (d.codigos || []).forEach(function (cod) {
          const l = acharLinha_(sh, String(cod || ''));
          if (l) { sh.deleteRow(l); removidos.push(cod); }
        });
        return json_({ ok: true, removidos: removidos });
      }
      const feitos = [], ausentes = [];
      (d.itens || []).forEach(function (it) {
        const l = acharLinha_(sh, String(it.codigo || ''));
        if (!l) { ausentes.push(it.codigo); return; }
        sh.getRange(l, COL['Status']).setValue('Confirmado');
        sh.getRange(l, COL['Confirmado em']).setValue(agora);
        if (it.obs) sh.getRange(l, COL['Observação do tesoureiro']).setValue(texto_(it.obs, 300));
        feitos.push(it.codigo);
      });
      return json_({ ok: true, confirmados: feitos, naoEncontrados: ausentes });
    }

    if (!CODIGO.test(d.codigo || '')) return json_({ ok: false, erro: 'código inválido' });
    const linha = acharLinha_(sh, d.codigo);

    if (d.acao === 'registrar') {
      const base = Math.round((Number(d.valorBase !== undefined ? d.valorBase : d.valor) || 0) * 100) / 100;
      // página sem valorBase gera o Pix sem centavos: não acrescentar nenhum
      const cent = d.valorBase === undefined ? 0 : escolherCentavos_(sh, linha, base, d.centavosFixos);
      const valorFinal = Math.round((base + cent / 100) * 100) / 100;
      const valores = {
        'Código': d.codigo,
        'Irmão': texto_(d.nome, 120),
        'WhatsApp': texto_(d.whatsapp, 30),
        'Loja ou Conselho': texto_(d.loja, 120),
        'Opção': texto_(d.opcaoNome, 80),
        'Valor (R$)': valorFinal,
        'Centavos de identificação': cent / 100,
        'Titular da conta do Pix': texto_(d.pagadorOutro ? d.pagador : (d.pagador ? d.pagador + ' (o próprio)' : ''), 120),
        'Banco do Pix': texto_(d.bancoPagador, 60),
      };
      if (linha) {
        Object.keys(valores).forEach(function (h) { sh.getRange(linha, COL[h]).setValue(valores[h]); });
      } else {
        valores['Status'] = 'Pix gerado';
        valores['Criado em'] = agora;
        sh.appendRow(CABECALHO.map(function (h) { return valores[h] !== undefined ? valores[h] : ''; }));
      }
      return json_({ ok: true, centavos: cent, valor: valorFinal });
    }

    if (d.acao === 'comprovante') {
      if (!linha) return json_({ ok: false, erro: 'pedido não encontrado' });
      const tipos = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };
      const ext = tipos[d.mime];
      if (!ext) return json_({ ok: false, erro: 'tipo de arquivo não aceito' });
      if (!d.dados || d.dados.length > 8 * 1024 * 1024) return json_({ ok: false, erro: 'arquivo grande demais' });
      const nomeIrmao = String(sh.getRange(linha, COL['Irmão']).getValue()).slice(0, 60);
      const blob = Utilities.newBlob(Utilities.base64Decode(d.dados), d.mime, d.codigo + ' - ' + nomeIrmao + '.' + ext);
      const arq = pastaComprovantes_().createFile(blob);
      sh.getRange(linha, COL['Comprovante']).setValue(arq.getUrl());
      if (sh.getRange(linha, COL['Status']).getValue() === 'Pix gerado') {
        sh.getRange(linha, COL['Status']).setValue('Pagamento informado');
        sh.getRange(linha, COL['Pagamento informado em']).setValue(agora);
      }
      return json_({ ok: true });
    }

    if (d.acao === 'pago') {
      if (!linha) return json_({ ok: false, erro: 'pedido não encontrado' });
      if (sh.getRange(linha, COL['Status']).getValue() !== 'Confirmado') sh.getRange(linha, COL['Status']).setValue('Pagamento informado');
      sh.getRange(linha, COL['Pagamento informado em']).setValue(agora);
      return json_({ ok: true });
    }

    return json_({ ok: false, erro: 'ação desconhecida' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- consultas ---------------- */
function doGet(e) {
  const q = e.parameter || {};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA);

  if (q.acao === 'status') {
    const linha = acharLinha_(sh, q.codigo || '');
    if (!linha) return json_({ ok: false });
    return json_({ ok: true, status: sh.getRange(linha, COL['Status']).getValue() });
  }

  if (q.acao === 'listar') {
    if (q.chave !== CHAVE_PAINEL || CHAVE_PAINEL === 'TROQUE-ESTA-SENHA') return json_({ ok: false, erro: 'senha incorreta' });
    const dados = sh.getDataRange().getValues();
    const cab = dados.shift();
    const pedidos = dados.filter(function (r) { return r[0]; }).map(function (r) {
      const o = {};
      cab.forEach(function (h, i) { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
      return o;
    });
    return json_({ ok: true, pedidos: pedidos, atualizado: new Date().toISOString() });
  }

  return json_({ ok: true, servico: 'Ágape · Jornada AMD 2026' });
}

/* Quando o tesoureiro marca "Confirmado", grava a data sozinho. */
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== ABA || e.range.getColumn() !== COL['Status'] || e.range.getRow() < 2) return;
  if (e.value === 'Confirmado') sh.getRange(e.range.getRow(), COL['Confirmado em']).setValue(new Date());
}

/* ---------------- centavos de identificação ----------------
   Cada pedido recebe centavos (R$ 0,01 a 0,99) que nenhum outro pedido
   ativo com o mesmo valor base usa. Pedido alterado mantém os centavos
   se o valor base não mudou. */
function escolherCentavos_(sh, linha, base, fixos) {
  if (fixos !== undefined && fixos !== null && fixos !== '') return Math.max(0, Math.min(99, Number(fixos) || 0));
  const ultima = sh.getLastRow();
  const usados = {};
  if (ultima >= 2) {
    const vals = sh.getRange(2, 1, ultima - 1, CABECALHO.length).getValues();
    vals.forEach(function (r, i) {
      if (!r[0] || r[COL['Status'] - 1] === 'Cancelado') return;
      const c = Math.round((Number(r[COL['Centavos de identificação'] - 1]) || 0) * 100);
      const b = Math.round(((Number(r[COL['Valor (R$)'] - 1]) || 0) - c / 100) * 100) / 100;
      if (b !== base) return;
      if (linha && i + 2 === linha) { usados.proprio = c; return; }
      usados[c] = true;
    });
  }
  if (usados.proprio && !usados[usados.proprio]) return usados.proprio;
  const livres = [];
  for (let c = 1; c <= 99; c++) if (!usados[c]) livres.push(c);
  return livres.length ? livres[Math.floor(Math.random() * livres.length)] : 0;
}

/* Pasta "Comprovantes — Ágape AMD 2026" no Drive do dono da planilha */
function pastaComprovantes_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_COMPROVANTES');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* apagada: cria outra */ } }
  const pasta = DriveApp.createFolder('Comprovantes — Ágape AMD 2026');
  props.setProperty('PASTA_COMPROVANTES', pasta.getId());
  return pasta;
}

/* ---------------- utilidades ---------------- */
function garantirCabecalho_(sh) {
  const atual = sh.getRange(1, 1, 1, CABECALHO.length).getValues()[0];
  if (atual.join('|') === CABECALHO.join('|')) return;
  sh.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO])
    .setFontWeight('bold').setBackground('#101f3c').setFontColor('#e9cd85');
}
function letra_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function acharLinha_(sh, codigo) {
  if (!codigo) return 0;
  const ultima = sh.getLastRow();
  if (ultima < 2) return 0;
  const achou = sh.getRange(2, 1, ultima - 1, 1).createTextFinder(codigo).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}
/* impede fórmula injetada (=, +, -, @ no início) e corta tamanho */
function texto_(s, max) {
  s = String(s == null ? '' : s).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
