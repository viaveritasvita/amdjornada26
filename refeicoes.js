/* ============================================================
   refeicoes.js — MOTOR DA PÁGINA DO ÁGAPE (AMD)
   O irmão escolhe uma opção de alimentação; a planilha devolve
   centavos de identificação; a página gera o Pix (BR Code com
   valor e código) e recebe o comprovante.
   O que se edita fica em refeicoes-config.js — não aqui.
   ============================================================ */
(function () {
  'use strict';

  const C = REFEICOES_CONFIG;
  const LS = {
    pedido: 'amdjornada26.pedido',   // último pedido feito neste aparelho
    fila: 'amdjornada26.fila',       // envios que falharam (sem internet) e serão reenviados
  };
  const API_OK = !!C.apiUrl && !/^COLE_/.test(C.apiUrl);
  const PIX_OK = !!C.pix.chave && !/^COLE_/.test(C.pix.chave) && !/^COLE_/.test(C.pix.nome || '');

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const opcaoPor = (id) => C.opcoes.find((o) => o.id === id);

  function lsGet(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado: segue sem memória */ }
  }

  /* ---------- estado ---------- */
  const state = { opcao: '', pedido: null };
  const total = () => (opcaoPor(state.opcao) ? opcaoPor(state.opcao).valor : 0);

  /* ============================================================
     PIX — BR Code estático com valor (padrão EMV do Banco Central)
     ============================================================ */
  function semAcento(s, max) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim().slice(0, max);
  }
  const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function pixPayload(valor, txid) {
    const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', C.pix.chave.trim());
    const p = tlv('00', '01')
      + tlv('26', conta)
      + tlv('52', '0000')
      + tlv('53', '986')
      + tlv('54', valor.toFixed(2))
      + tlv('58', 'BR')
      + tlv('59', semAcento(C.pix.nome, 25))
      + tlv('60', semAcento(C.pix.cidade, 15))
      + tlv('62', tlv('05', txid))
      + '6304';
    return p + crc16(p);
  }

  /* Código do pedido: vai no Pix (identificador) e na planilha.
     Sem 0/O/1/I para não confundir quem lê no extrato. */
  function novoCodigo() {
    const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = 'AM';
    const rnd = new Uint32Array(6);
    (window.crypto || window.msCrypto).getRandomValues(rnd);
    rnd.forEach((n) => { s += abc[n % abc.length]; });
    return s;
  }

  /* ============================================================
     ENVIO À PLANILHA (Apps Script)
     ============================================================ */
  async function enviar(dados) {
    if (!API_OK) return false;
    try {
      const res = await fetch(C.apiUrl, { method: 'POST', body: JSON.stringify(dados) });
      const json = await res.json().catch(() => ({}));
      return json.ok !== false;
    } catch (e) {
      try {
        await fetch(C.apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dados) });
        return true;
      } catch (e2) {
        const fila = lsGet(LS.fila, []);
        fila.push(dados);
        lsSet(LS.fila, fila);
        return false;
      }
    }
  }
  async function esvaziarFila() {
    const fila = lsGet(LS.fila, []);
    if (!fila.length || !API_OK) return;
    lsSet(LS.fila, []);
    for (const d of fila) await enviar(d);
  }
  async function consultarStatus(codigo) {
    if (!API_OK) return null;
    try {
      const res = await fetch(C.apiUrl + '?acao=status&codigo=' + encodeURIComponent(codigo));
      const json = await res.json();
      return json && json.ok ? json.status : null;
    } catch (e) { return null; }
  }

  /* Registra e ESPERA a resposta: a planilha devolve os centavos de
     identificação (únicos entre os pedidos do mesmo valor). */
  async function registrarComCentavos(dados) {
    if (!API_OK) return null;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(C.apiUrl, { method: 'POST', body: JSON.stringify(dados), signal: ctl.signal });
      const json = await res.json();
      return json && json.ok && typeof json.centavos === 'number' ? json : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  /* ============================================================
     RENDERIZAÇÃO
     ============================================================ */
  function renderOpcoes() {
    $('#fOpcoes').innerHTML = C.opcoes.map((o) => `
      <label class="rf-option${state.opcao === o.id ? ' is-on' : ''}">
        <input type="radio" name="opcao" value="${o.id}"${state.opcao === o.id ? ' checked' : ''}>
        <span class="rf-check rf-radio" aria-hidden="true"></span>
        <span class="rf-option-text"><strong>${esc(o.nome)}</strong><span>${esc(o.detalhe)}</span></span>
        <span class="rf-option-price">${brl(o.valor)}</span>
      </label>`).join('');
    $$('#fOpcoes input').forEach((el) => el.addEventListener('change', () => {
      state.opcao = el.value;
      renderOpcoes();
      renderResumo();
    }));
  }

  function renderResumo() {
    const o = opcaoPor(state.opcao);
    const nome = $('#fNome').value.trim() || 'Você';
    $('#rfResumo').innerHTML = `
      <ul class="rf-sum-list"><li><span class="rf-sum-who">${esc(nome)}<small>${o ? esc(o.nome + ' · ' + o.detalhe) : 'escolha uma opção no passo 2'}</small></span><span>${o ? brl(o.valor) : '—'}</span></li></ul>
      <div class="rf-sum-total"><span>Total a pagar</span><strong>${brl(total())}</strong></div>`;
    $('#barTotal').textContent = brl(total());
  }

  /* ============================================================
     VALIDAÇÃO E GERAÇÃO DO PIX
     ============================================================ */
  function erro(msg, foco) {
    const el = $('#rfErro');
    el.textContent = msg;
    el.hidden = !msg;
    if (msg && foco) { foco.focus({ preventScroll: true }); foco.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  function validar() {
    const nome = $('#fNome').value.trim();
    const whats = $('#fWhats').value.replace(/\D/g, '');
    if (nome.split(/\s+/).length < 2) return erro('Informe o seu nome completo.', $('#fNome')), false;
    if (whats.length < 10 || whats.length > 13) return erro('Informe um WhatsApp válido, com DDD.', $('#fWhats')), false;
    if (!opcaoPor(state.opcao)) return erro('Escolha a sua opção de alimentação.', $('#fOpcoes input')), false;
    erro('');
    return true;
  }

  const pagadorOutro = () => $('input[name="pagador"]:checked').value === 'outro';
  function marcarPagador(outro) {
    $$('input[name="pagador"]').forEach((el) => {
      el.checked = (el.value === 'outro') === outro;
      el.closest('label').classList.toggle('is-on', el.checked);
    });
    $('#fPagadorBox').hidden = !outro;
  }

  function montarPedido(codigo) {
    const o = opcaoPor(state.opcao);
    return {
      acao: 'registrar',
      codigo,
      nome: $('#fNome').value.trim(),
      whatsapp: $('#fWhats').value.trim(),
      loja: $('#fLoja').value.trim(),
      opcao: o.id,
      opcaoNome: o.nome,
      // quem faz o Pix (opcional): ajuda a achar o pagamento no extrato
      pagadorOutro: pagadorOutro(),
      pagador: pagadorOutro() ? $('#fPagador').value.trim() : $('#fNome').value.trim(),
      bancoPagador: $('#fBanco').value.trim(),
      valorBase: o.valor,
      valor: o.valor,
    };
  }

  function ocupado(sim) {
    ['#btnGerar', '#barGerar'].forEach((s) => {
      const b = $(s);
      b.disabled = sim;
      b.textContent = sim ? 'Gerando seu Pix…' : 'Gerar Pix';
    });
  }

  async function gerarPix(ev) {
    if (ev) ev.preventDefault();
    if (!validar()) return;
    if ($('#btnGerar').disabled) return;

    // Alterar o pedido mantém o mesmo código (a planilha atualiza a linha)
    const codigo = (state.pedido && state.pedido.codigo) || novoCodigo();
    const dados = montarPedido(codigo);
    let centavos = 0;
    if (API_OK) {
      ocupado(true);
      const r = await registrarComCentavos(dados);
      ocupado(false);
      if (r) centavos = r.centavos;
      else enviar({ ...dados, centavosFixos: 0 }); // sem resposta: segue sem centavos e avisa a planilha
    }
    dados.centavos = centavos;
    dados.valor = Math.round((dados.valorBase + centavos / 100) * 100) / 100;
    // Sem Pix completo (versão de avaliação): percorre o fluxo, mas sem QR
    const payload = PIX_OK ? pixPayload(dados.valor, codigo) : '';
    state.pedido = { ...dados, payload, status: 'Pix gerado', criadoEm: new Date().toISOString() };
    lsSet(LS.pedido, state.pedido);

    mostrarPagamento();
  }

  function desenharQr(texto) {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    $('#payQr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  /* ---------- comprovante (foto ou PDF) ----------
     Fotos são reduzidas (lado maior 1600 px, JPEG) antes de subir. */
  function lerComoBase64(blob) {
    return new Promise((ok, falha) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result).split(',')[1]);
      fr.onerror = falha;
      fr.readAsDataURL(blob);
    });
  }
  async function reduzirFoto(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k);
      cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.82));
      return blob ? { blob, mime: 'image/jpeg' } : { blob: file, mime: file.type };
    } catch (e) {
      return { blob: file, mime: file.type }; // formato que o navegador não abre (ex.: HEIC): vai como está
    }
  }
  async function enviarComprovante(input) {
    const file = input.files && input.files[0];
    const box = input.closest('.rf-upload');
    const msg = $('.rf-upload-msg', box);
    if (!file) return;
    const p = state.pedido;
    const ehPdf = file.type === 'application/pdf';
    if (!ehPdf && !/^image\//.test(file.type)) { msg.textContent = 'Envie uma foto ou um PDF.'; return; }
    if (file.size > 6 * 1024 * 1024 && ehPdf) { msg.textContent = 'PDF grande demais (máximo 6 MB).'; return; }
    box.classList.add('is-busy');
    msg.textContent = 'Enviando o comprovante…';
    try {
      const { blob, mime } = ehPdf ? { blob: file, mime: 'application/pdf' } : await reduzirFoto(file);
      const dados = await lerComoBase64(blob);
      const res = await fetch(C.apiUrl, { method: 'POST', body: JSON.stringify({ acao: 'comprovante', codigo: p.codigo, mime, dados }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.erro || 'erro');
      p.comprovante = true;
      if (p.status === 'Pix gerado') { p.status = 'Pagamento informado'; p.pagoEm = new Date().toISOString(); }
      lsSet(LS.pedido, p);
      atualizarUpload();
      if (!$('#rfPagamento').hidden) setTimeout(mostrarFeito, 900);
    } catch (e) {
      msg.textContent = 'Não foi possível enviar agora. Tente de novo ou mande pelo WhatsApp.';
    } finally {
      box.classList.remove('is-busy');
      input.value = '';
    }
  }
  function atualizarUpload() {
    const enviado = state.pedido && state.pedido.comprovante;
    $$('.rf-upload').forEach((b) => {
      b.hidden = !API_OK;
      b.classList.toggle('is-ok', !!enviado);
      $('.rf-btn', b).textContent = enviado ? 'Comprovante enviado' : 'Enviar o comprovante';
      $('.rf-upload-msg', b).textContent = enviado ? 'Recebido. Obrigado! (pode enviar outro, se precisar)' : 'Foto (print) ou PDF do comprovante do Pix.';
    });
  }

  /* ---------- WhatsApp de quem recebe os comprovantes ----------
     A mensagem já vai escrita com o código, a opção e o valor. */
  const WHATS_OK = !!(C.tesoureiro && /^\d{12,13}$/.test(C.tesoureiro.whatsapp || ''));
  function textoWhats(tipo) {
    const t = C.tesoureiro.nome;
    const p = state.pedido;
    if (tipo === 'comprovante' && p) {
      return `Olá, ${t}! Sou ${p.nome}${p.loja ? ', da ' + p.loja : ''}. Fiz o pedido ${p.codigo} do ágape (${p.opcaoNome}), no valor de ${brl(p.valor)}. Segue o comprovante do Pix:`;
    }
    return `Olá, ${t}! Tenho uma dúvida sobre o ágape da Jornada AMD:`;
  }
  function atualizarWhats() {
    $$('[data-whats]').forEach((a) => {
      a.hidden = !WHATS_OK;
      if (WHATS_OK) a.href = `https://wa.me/${C.tesoureiro.whatsapp}?text=${encodeURIComponent(textoWhats(a.dataset.whats))}`;
    });
    const box = $('[data-whats-box]');
    if (box) box.hidden = !WHATS_OK;
  }

  function mostrarPagamento() {
    const p = state.pedido;
    $('#rfForm').hidden = true;
    $('#rfFeito').hidden = true;
    $('#rfSaved').innerHTML = '';
    $('#rfPagamento').hidden = false;
    $('#rfBar').hidden = true;
    document.body.dataset.modo = 'pagamento';

    $('#payCodigo').textContent = p.codigo;
    $('#payCodigo2').textContent = p.codigo;
    $('#payTotal').textContent = brl(p.valor);
    $('#payQuem').textContent = `${p.nome} · ${p.opcaoNome}`;
    $('#payChave').textContent = C.pix.chave;
    $('#payFavorecido').textContent = C.pix.titular || C.pix.nome;
    $('#payBanco').textContent = C.pix.banco;
    $('#payBanco').hidden = $('#payBancoLbl').hidden = !C.pix.banco;
    $('#payValor').textContent = brl(p.valor);
    const cent = p.centavos || 0;
    $('#payCentavos').hidden = !cent;
    if (cent) $('#payCentavos').innerHTML = `Os <strong>${cent} ${cent > 1 ? 'centavos' : 'centavo'}</strong> a mais identificam o seu Pix no extrato. Pague o <strong>valor exato</strong>.`;
    atualizarUpload();
    $('#btnCopiaCola').hidden = $('#btnCopiaChave').hidden = !p.payload;
    if (p.payload) desenharQr(p.payload);
    else {
      $('#payQr').innerHTML = '<p class="rf-qr-demo">Versão de avaliação<br><small>O QR Code do Pix aparece aqui, já com o valor.</small></p>';
    }
    atualizarWhats();
    window.scrollTo({ top: 0 });
  }

  async function informarPagamento() {
    const p = state.pedido;
    p.status = 'Pagamento informado';
    p.pagoEm = new Date().toISOString();
    lsSet(LS.pedido, p);
    enviar({ acao: 'pago', codigo: p.codigo });
    mostrarFeito();
  }

  function mostrarFeito() {
    const p = state.pedido;
    $('#rfForm').hidden = true;
    $('#rfPagamento').hidden = true;
    $('#rfFeito').hidden = false;
    $('#rfBar').hidden = true;
    document.body.dataset.modo = 'feito';
    $('#doneNome').textContent = p.nome.split(' ')[0];
    $('#doneCodigo').textContent = p.codigo;
    $('#doneTotal').textContent = brl(p.valor);
    atualizarWhats();
    atualizarUpload();
    window.scrollTo({ top: 0 });
  }

  function voltarAoFormulario(limpar) {
    if (limpar) {
      state.pedido = null;
      state.opcao = '';
      $('#rfForm').reset();
      marcarPagador(false);
    }
    $('#rfPagamento').hidden = true;
    $('#rfFeito').hidden = true;
    $('#rfForm').hidden = false;
    $('#rfBar').hidden = false;
    document.body.dataset.modo = '';
    renderOpcoes();
    renderResumo();
    window.scrollTo({ top: $('#rfForm').offsetTop - 70, behavior: 'smooth' });
  }

  /* Recarrega um pedido salvo no formulário (para "Alterar o pedido") */
  function preencherFormulario(p) {
    $('#fNome').value = p.nome;
    $('#fWhats').value = p.whatsapp;
    $('#fLoja').value = p.loja || '';
    state.opcao = p.opcao || '';
    marcarPagador(!!p.pagadorOutro);
    $('#fPagador').value = p.pagadorOutro ? (p.pagador || '') : '';
    $('#fBanco').value = p.bancoPagador || '';
    renderOpcoes();
    renderResumo();
  }

  /* ---------- pedido salvo neste aparelho ---------- */
  async function renderSalvo() {
    const p = lsGet(LS.pedido, null);
    if (!p || !p.opcao) return;
    state.pedido = p;
    preencherFormulario(p);
    const box = $('#rfSaved');
    const desenhar = (status) => {
      const conf = /confirmad/i.test(status);
      box.innerHTML = `<div class="rf-card rf-saved${conf ? ' is-ok' : ''}">
        <div class="rf-saved-head">
          <div><span class="rf-muted">Seu pedido</span><strong>${esc(p.codigo)} · ${brl(p.valor)}</strong></div>
          <span class="rf-badge${conf ? ' is-ok' : ''}">${esc(status)}</span>
        </div>
        <p class="rf-muted">${esc(p.nome)} · ${esc(p.opcaoNome)}</p>
        <div class="rf-saved-actions">
          ${conf ? '' : '<button type="button" class="rf-btn rf-btn-gold" id="savedPix">Ver o Pix</button>'}
          <button type="button" class="rf-btn rf-btn-ghost" id="savedNovo">Novo pedido</button>
        </div>
      </div>`;
      const ver = $('#savedPix');
      if (ver) ver.addEventListener('click', mostrarPagamento);
      $('#savedNovo').addEventListener('click', () => { box.innerHTML = ''; voltarAoFormulario(true); });
    };
    desenhar(p.status);
    const remoto = await consultarStatus(p.codigo);
    if (remoto && remoto !== p.status) { p.status = remoto; lsSet(LS.pedido, p); desenhar(remoto); }
  }

  /* ---------- utilidades ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }
  async function copiar(texto, msg) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* sem cópia */ }
      ta.remove();
    }
    toast(msg);
  }

  function mascaraWhats(el) {
    el.addEventListener('input', () => {
      const d = el.value.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) el.value = d.length ? '(' + d : '';
      else if (d.length <= 6) el.value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      else if (d.length <= 10) el.value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      else el.value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    });
  }

  /* ============================================================
     INÍCIO
     ============================================================ */
  function init() {
    renderOpcoes();
    renderResumo();
    mascaraWhats($('#fWhats'));

    if (C.encerraEm && Date.now() > Date.parse(C.encerraEm)) {
      $('#rfForm').hidden = true;
      $('#rfBar').hidden = true;
      $('#rfClosed').hidden = false;
    }

    $('#fNome').addEventListener('input', renderResumo);
    $$('input[name="pagador"]').forEach((el) => el.addEventListener('change', () => {
      marcarPagador(el.value === 'outro');
      if (el.value === 'outro') $('#fPagador').focus();
    }));
    $('#rfForm').addEventListener('submit', gerarPix);
    $('#barGerar').addEventListener('click', gerarPix);
    $('#btnCopiaCola').addEventListener('click', () => copiar(state.pedido.payload, 'Código Pix copiado'));
    $('#btnCopiaChave').addEventListener('click', () => copiar(C.pix.chave, 'Chave Pix copiada'));
    $('#btnPaguei').addEventListener('click', informarPagamento);
    $('#btnAlterar').addEventListener('click', () => { preencherFormulario(state.pedido); voltarAoFormulario(false); });
    $('#btnNovo').addEventListener('click', () => voltarAoFormulario(true));

    if (!API_OK) $('#rfFootNote').textContent = 'Modo de teste · planilha ainda não conectada';
    $('#rfDemo').hidden = PIX_OK;
    atualizarWhats();
    $$('.rf-upload input[type="file"]').forEach((el) => el.addEventListener('change', () => enviarComprovante(el)));

    renderSalvo();
    esvaziarFila();
    window.addEventListener('online', esvaziarFila);

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  init();
})();
