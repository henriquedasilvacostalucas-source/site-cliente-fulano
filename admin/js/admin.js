/* =====================================================================
   PAINEL DE EDIÇÃO — lógica principal
   Lê admin/config.yml (mesmo padrão usado pelo Decap CMS) e monta um
   formulário bonito e responsivo automaticamente a partir dele.
   Salva o conteúdo e as imagens direto no repositório via API do GitHub.
===================================================================== */

const ICONES_SECAO = ['◆','✦','●','▲','■','★','◆','✦','●','▲'];

const Estado = {
  token: null,
  config: null,       // config.yml parseado
  repo: null,
  branch: 'main',
  mediaFolder: 'assets/uploads',
  publicFolder: 'assets/uploads',
  arquivoCms: null,    // { path, fields, label }
  sha: null,           // sha atual do content/site.json no GitHub
  dados: null,         // objeto de conteúdo em edição
  sujo: false,         // há alterações não salvas
  uploadsEmAndamento: 0,
};

const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

/* ---------------------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  ligarEventosLogin();
  ligarEventosApp();

  const tokenSalvo = sessionStorage.getItem('gh_token');
  if (tokenSalvo) {
    Estado.token = tokenSalvo;
    await entrarNoApp();
  }
}

/* ---------------------------------------------------------------------
   LOGIN (OAuth GitHub via /api/auth e /api/callback já existentes)
--------------------------------------------------------------------- */
function ligarEventosLogin() {
  $('#btn-login').addEventListener('click', fazerLogin);
}

function fazerLogin() {
  esconderErroLogin();
  const largura = 600, altura = 700;
  const esquerda = window.screenX + (window.outerWidth - largura) / 2;
  const topo = window.screenY + (window.outerHeight - altura) / 2.5;
  const popup = window.open(
    'api/auth',
    'gh-oauth',
    `width=${largura},height=${altura},left=${esquerda},top=${topo}`
  );

  function receberMensagem(evento) {
    const dado = evento.data;
    if (typeof dado !== 'string' || !dado.startsWith('authorization:github:')) return;

    const partes = dado.match(/^authorization:github:(success|error):(.*)$/s);
    if (!partes) return;
    window.removeEventListener('message', receberMensagem);

    const [, status, jsonTexto] = partes;
    if (status === 'success') {
      try {
        const conteudo = JSON.parse(jsonTexto);
        Estado.token = conteudo.token;
        sessionStorage.setItem('gh_token', Estado.token);
        if (popup) popup.close();
        entrarNoApp();
      } catch (e) {
        mostrarErroLogin('Não foi possível concluir o login. Tente novamente.');
      }
    } else {
      mostrarErroLogin('Login cancelado ou não autorizado.');
    }
  }
  window.addEventListener('message', receberMensagem);
}

function mostrarErroLogin(msg) {
  const el = $('#login-erro');
  el.textContent = msg;
  el.hidden = false;
}
function esconderErroLogin() { $('#login-erro').hidden = true; }

function sair() {
  sessionStorage.removeItem('gh_token');
  Estado.token = null;
  $('#app').hidden = true;
  $('#tela-login').hidden = false;
}

/* ---------------------------------------------------------------------
   CARREGAR CONFIG.YML + CONTEÚDO
--------------------------------------------------------------------- */
async function entrarNoApp() {
  $('#tela-login').hidden = true;
  $('#app').hidden = false;

  try {
    await carregarConfig();
    await carregarConteudo();
    montarNavegacao();
    montarFormulario();
    $('#loading').hidden = true;
    ativarSecao(Estado.arquivoCms.fields[0].name);
  } catch (erro) {
    console.error(erro);
    $('#loading').innerHTML = `<p style="color:#c0392b;max-width:340px;text-align:center">
      Não foi possível carregar o painel: ${escaparHtml(erro.message)}.<br>
      Verifique o arquivo <code>admin/config.yml</code> e tente atualizar a página.</p>`;
  }
}

async function carregarConfig() {
  const resp = await fetch('config.yml?_=' + Date.now());
  if (!resp.ok) throw new Error('config.yml não encontrado');
  const texto = await resp.text();
  Estado.config = jsyaml.load(texto);

  Estado.repo = Estado.config.backend.repo;
  Estado.branch = Estado.config.backend.branch || 'main';
  Estado.mediaFolder = Estado.config.media_folder || 'assets/uploads';
  Estado.publicFolder = Estado.config.public_folder || Estado.mediaFolder;
  Estado.arquivoCms = Estado.config.collections[0].files[0];

  $('#link-ver-site').href = Estado.config.backend.base_url || '#';
  $('#link-ver-site-mobile').href = Estado.config.backend.base_url || '#';
  $('#topbar-nome').textContent = Estado.config.collections[0].label || 'Meu site';
}

async function carregarConteudo() {
  const caminho = Estado.arquivoCms.file;
  const { sha, dados } = await githubLerArquivo(caminho);
  Estado.sha = sha;
  Estado.dados = dados;
}

/* ---------------------------------------------------------------------
   GITHUB API — helpers
--------------------------------------------------------------------- */
async function githubFetch(caminho, opcoes = {}) {
  const url = `https://api.github.com/repos/${Estado.repo}/contents/${caminho}`;
  const resp = await fetch(url, {
    ...opcoes,
    headers: {
      Authorization: `token ${Estado.token}`,
      Accept: 'application/vnd.github+json',
      ...(opcoes.headers || {}),
    },
  });
  return resp;
}

async function githubLerArquivo(caminho) {
  const resp = await githubFetch(`${caminho}?ref=${Estado.branch}`);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Sessão expirada, faça login novamente');
    throw new Error(`Não foi possível ler ${caminho} (${resp.status})`);
  }
  const json = await resp.json();
  const texto = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  return { sha: json.sha, dados: JSON.parse(texto) };
}

async function githubSalvarArquivo(caminho, conteudoTexto, shaAtual, mensagem) {
  const conteudoBase64 = btoa(unescape(encodeURIComponent(conteudoTexto)));
  const resp = await githubFetch(caminho, {
    method: 'PUT',
    body: JSON.stringify({
      message: mensagem,
      content: conteudoBase64,
      sha: shaAtual,
      branch: Estado.branch,
    }),
  });
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new Error(erro.message || `Falha ao salvar ${caminho}`);
  }
  return resp.json();
}

async function githubEnviarImagem(nomeArquivo, base64Puro) {
  const caminho = `${Estado.mediaFolder}/${nomeArquivo}`;
  const resp = await githubFetch(caminho, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Envia imagem ${nomeArquivo}`,
      content: base64Puro,
      branch: Estado.branch,
    }),
  });
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new Error(erro.message || 'Falha ao enviar imagem');
  }
  return `${Estado.publicFolder}/${nomeArquivo}`;
}

/* ---------------------------------------------------------------------
   NAVEGAÇÃO LATERAL
--------------------------------------------------------------------- */
function montarNavegacao() {
  const nav = $('#nav-lista');
  nav.innerHTML = '';
  Estado.arquivoCms.fields.forEach((campo, i) => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.secao = campo.name;
    btn.innerHTML = `<span class="dot"></span> ${escaparHtml(campo.label || campo.name)}`;
    btn.addEventListener('click', () => {
      ativarSecao(campo.name);
      fecharMenuMobile();
    });
    nav.appendChild(btn);
  });
}

function ativarSecao(nome) {
  $$('.nav-item').forEach(b => b.classList.toggle('ativo', b.dataset.secao === nome));
  $$('.secao').forEach(s => s.classList.toggle('ativa', s.dataset.secao === nome));
  $('#conteudo').scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------------------------------------------------------------------
   MONTAGEM DO FORMULÁRIO (dinâmico a partir do config.yml)
--------------------------------------------------------------------- */
function montarFormulario() {
  const raiz = $('#secoes');
  raiz.innerHTML = '';

  Estado.arquivoCms.fields.forEach(campoSecao => {
    const secao = document.createElement('section');
    secao.className = 'secao';
    secao.dataset.secao = campoSecao.name;

    secao.innerHTML = `
      <div class="secao-header">
        <h2>${escaparHtml(campoSecao.label || campoSecao.name)}</h2>
      </div>
      <div class="card secao-card"></div>
    `;
    const card = secao.querySelector('.secao-card');

    if (Estado.dados[campoSecao.name] === undefined) {
      Estado.dados[campoSecao.name] = valorPadraoPara(campoSecao);
    }

    if (campoSecao.widget === 'object') {
      (campoSecao.fields || []).forEach(sub => {
        card.appendChild(criarCampo(sub, Estado.dados[campoSecao.name], sub.name));
      });
    } else {
      card.appendChild(criarCampo(campoSecao, Estado.dados, campoSecao.name));
    }

    raiz.appendChild(secao);
  });
}

function valorPadraoPara(campo) {
  if (campo.widget === 'object') return {};
  if (campo.widget === 'list') return [];
  return '';
}

// Cria o elemento de UI para um campo, lendo/gravando em `objetoPai[chave]`
function criarCampo(campo, objetoPai, chave) {
  const wrapper = document.createElement('div');
  wrapper.className = 'campo';

  switch (campo.widget) {
    case 'text':
      wrapper.appendChild(rotulo(campo));
      wrapper.appendChild(criarTextarea(objetoPai, chave));
      return wrapper;

    case 'image':
      wrapper.appendChild(rotulo(campo));
      wrapper.appendChild(criarUploadImagem(objetoPai, chave));
      return wrapper;

    case 'object': {
      const grupo = document.createElement('div');
      grupo.className = 'grupo-objeto';
      grupo.innerHTML = `<label>${escaparHtml(campo.label || campo.name)}</label>`;
      if (objetoPai[chave] === undefined) objetoPai[chave] = {};
      (campo.fields || []).forEach(sub => {
        grupo.appendChild(criarCampo(sub, objetoPai[chave], sub.name));
      });
      return grupo;
    }

    case 'list':
      wrapper.appendChild(rotulo(campo));
      wrapper.appendChild(criarLista(campo, objetoPai, chave));
      return wrapper;

    case 'string':
    default:
      wrapper.appendChild(rotulo(campo));
      wrapper.appendChild(criarInputTexto(objetoPai, chave));
      return wrapper;
  }
}

function rotulo(campo) {
  const l = document.createElement('label');
  l.textContent = campo.label || campo.name;
  return l;
}

function criarInputTexto(objetoPai, chave) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = objetoPai[chave] ?? '';
  input.addEventListener('input', () => {
    objetoPai[chave] = input.value;
    marcarAlterado();
  });
  return input;
}

function criarTextarea(objetoPai, chave) {
  const ta = document.createElement('textarea');
  ta.value = objetoPai[chave] ?? '';
  ta.addEventListener('input', () => {
    objetoPai[chave] = ta.value;
    marcarAlterado();
  });
  return ta;
}

function criarUploadImagem(objetoPai, chave) {
  const box = document.createElement('div');
  box.className = 'campo-imagem';

  const preview = document.createElement('div');
  preview.className = 'preview-imagem' + (objetoPai[chave] ? '' : ' vazio');
  atualizarPreview(preview, objetoPai[chave]);

  const controles = document.createElement('div');
  controles.className = 'upload-controles';

  const idInput = 'up_' + Math.random().toString(36).slice(2);
  controles.innerHTML = `
    <input type="file" id="${idInput}" accept="image/*">
    <button type="button" class="btn-secundario btn-escolher">Escolher imagem</button>
    <span class="upload-status"></span>
  `;
  const inputFile = controles.querySelector('input[type=file]');
  const status = controles.querySelector('.upload-status');
  controles.querySelector('.btn-escolher').addEventListener('click', () => inputFile.click());

  inputFile.addEventListener('change', async () => {
    const arquivo = inputFile.files[0];
    if (!arquivo) return;
    status.textContent = 'Enviando…';
    status.className = 'upload-status enviando';
    Estado.uploadsEmAndamento++;
    atualizarBotaoSalvar();
    try {
      const caminhoPublico = await enviarImagemParaGithub(arquivo);
      objetoPai[chave] = caminhoPublico;
      atualizarPreview(preview, caminhoPublico);
      preview.classList.remove('vazio');
      status.textContent = 'Imagem enviada ✓';
      status.className = 'upload-status';
      marcarAlterado();
    } catch (e) {
      status.textContent = 'Erro ao enviar: ' + e.message;
      status.className = 'upload-status erro';
    } finally {
      Estado.uploadsEmAndamento--;
      atualizarBotaoSalvar();
    }
  });

  box.appendChild(preview);
  box.appendChild(controles);
  return box;
}

function atualizarPreview(elPreview, caminho) {
  if (caminho) {
    elPreview.style.backgroundImage = `url('${urlBrutaGithub(caminho)}')`;
    elPreview.textContent = '';
  } else {
    elPreview.style.backgroundImage = '';
    elPreview.textContent = 'Sem imagem';
  }
}

function urlBrutaGithub(caminhoRelativo) {
  return `https://raw.githubusercontent.com/${Estado.repo}/${Estado.branch}/${caminhoRelativo}?_=${Date.now() % 100000}`;
}

async function enviarImagemParaGithub(arquivo) {
  const base64Completo = await arquivoParaBase64(arquivo);
  const base64Puro = base64Completo.split(',')[1];
  const nomeSeguro = `${Date.now()}-${arquivo.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
  return githubEnviarImagem(nomeSeguro, base64Puro);
}

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

/* ---- Listas (serviços, galeria, depoimentos, etc.) ---- */
function criarLista(campo, objetoPai, chave) {
  if (!Array.isArray(objetoPai[chave])) objetoPai[chave] = [];
  const array = objetoPai[chave];
  const ehImagemUnica = !!campo.field && campo.field.widget === 'image';

  const container = document.createElement('div');
  const listaEl = document.createElement('div');
  listaEl.className = ehImagemUnica ? 'grade-imagens' : 'lista-itens';
  container.appendChild(listaEl);

  function redesenhar() {
    listaEl.innerHTML = '';
    array.forEach((item, indice) => {
      listaEl.appendChild(criarItemLista(campo, array, indice, redesenhar, ehImagemUnica));
    });
  }

  const btnAdd = document.createElement('button');
  btnAdd.type = 'button';
  btnAdd.className = 'btn-add-item';
  btnAdd.textContent = '+ Adicionar ' + (campo.label ? campo.label.toLowerCase().replace(/^lista de /, '').replace(/s$/,'') : 'item');
  btnAdd.addEventListener('click', () => {
    if (ehImagemUnica) {
      array.push('');
    } else {
      const novo = {};
      (campo.fields || []).forEach(f => novo[f.name] = valorPadraoPara(f));
      array.push(novo);
    }
    marcarAlterado();
    redesenhar();
  });

  redesenhar();
  container.appendChild(btnAdd);
  return container;
}

function criarItemLista(campoLista, array, indice, redesenhar, ehImagemUnica) {
  if (ehImagemUnica) {
    const slot = document.createElement('div');
    slot.className = 'slot-imagem-lista';
    // objeto "proxy" que lê/grava direto na posição do array
    const objetoProxy = {};
    Object.defineProperty(objetoProxy, 'valor', {
      get(){ return array[indice]; },
      set(v){ array[indice] = v; }
    });
    const uploadEl = criarUploadImagem(objetoProxy, 'valor');
    slot.appendChild(uploadEl);
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'btn-secundario btn-perigo';
    btnRemover.textContent = 'Remover';
    btnRemover.style.marginTop = '4px';
    btnRemover.addEventListener('click', () => {
      array.splice(indice, 1);
      marcarAlterado();
      redesenhar();
    });
    slot.appendChild(btnRemover);
    return slot;
  }

  const item = document.createElement('div');
  item.className = 'lista-item';
  item.innerHTML = `
    <div class="lista-item-topo">
      <span class="rotulo">Item ${indice + 1}</span>
      <div class="lista-item-acoes"></div>
    </div>
  `;
  const acoes = item.querySelector('.lista-item-acoes');

  const btnSubir = botaoIcone('↑', () => {
    if (indice === 0) return;
    [array[indice - 1], array[indice]] = [array[indice], array[indice - 1]];
    marcarAlterado(); redesenhar();
  });
  const btnDescer = botaoIcone('↓', () => {
    if (indice === array.length - 1) return;
    [array[indice + 1], array[indice]] = [array[indice], array[indice + 1]];
    marcarAlterado(); redesenhar();
  });
  const btnRemover = botaoIcone('✕', () => {
    array.splice(indice, 1);
    marcarAlterado(); redesenhar();
  });
  btnRemover.classList.add('remover');
  acoes.append(btnSubir, btnDescer, btnRemover);

  (campoLista.fields || []).forEach(sub => {
    item.appendChild(criarCampo(sub, array[indice], sub.name));
  });

  return item;
}

function botaoIcone(txt, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = txt;
  b.addEventListener('click', aoClicar);
  return b;
}

/* ---------------------------------------------------------------------
   MENU MOBILE
--------------------------------------------------------------------- */
function ligarEventosApp() {
  $('#btn-menu').addEventListener('click', () => {
    $('#sidebar').classList.add('aberta');
    $('#overlay').hidden = false;
  });
  $('#overlay').addEventListener('click', fecharMenuMobile);
  $('#btn-sair').addEventListener('click', sair);
  $('#btn-salvar').addEventListener('click', salvar);
  $('#btn-salvar-mobile').addEventListener('click', salvar);

  window.addEventListener('beforeunload', (e) => {
    if (Estado.sujo) { e.preventDefault(); e.returnValue = ''; }
  });
}

function fecharMenuMobile() {
  $('#sidebar').classList.remove('aberta');
  $('#overlay').hidden = true;
}

/* ---------------------------------------------------------------------
   ESTADO SUJO / SALVAR
--------------------------------------------------------------------- */
function marcarAlterado() {
  Estado.sujo = true;
  atualizarBotaoSalvar();
}

function atualizarBotaoSalvar() {
  const podeSalvar = Estado.sujo && Estado.uploadsEmAndamento === 0;
  $('#btn-salvar').disabled = !podeSalvar;
  $('#btn-salvar-mobile').disabled = !podeSalvar;

  const status = Estado.uploadsEmAndamento > 0
    ? ['Enviando imagem…', 'status-salvando']
    : Estado.sujo
      ? ['Alterações não salvas', 'status-pendente']
      : ['Tudo salvo', 'status-ok'];

  [$('#status-pill'), $('#status-pill-mobile')].forEach(el => {
    el.textContent = status[0];
    el.className = 'status-pill ' + status[1];
  });
}

async function salvar() {
  if (!Estado.sujo || Estado.uploadsEmAndamento > 0) return;
  $('#btn-salvar').disabled = true;
  $('#btn-salvar-mobile').disabled = true;
  mostrarStatusSalvando(true);

  try {
    // pega o sha mais recente antes de gravar, evita conflito
    const atual = await githubLerArquivo(Estado.arquivoCms.file);
    const conteudoTexto = JSON.stringify(Estado.dados, null, 2) + '\n';
    await githubSalvarArquivo(Estado.arquivoCms.file, conteudoTexto, atual.sha, 'Atualiza conteúdo do site pelo painel de edição');
    Estado.sujo = false;
    mostrarToast('Alterações salvas com sucesso!', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao salvar: ' + e.message, 'erro');
  } finally {
    mostrarStatusSalvando(false);
    atualizarBotaoSalvar();
  }
}

function mostrarStatusSalvando(ligado) {
  [$('#status-pill'), $('#status-pill-mobile')].forEach(el => {
    if (ligado) { el.textContent = 'Salvando…'; el.className = 'status-pill status-salvando'; }
  });
}

let timeoutToast;
function mostrarToast(msg, tipo) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + tipo;
  el.hidden = false;
  clearTimeout(timeoutToast);
  timeoutToast = setTimeout(() => { el.hidden = true; }, 3500);
}

/* ---------------------------------------------------------------------
   UTIL
--------------------------------------------------------------------- */
function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}
