async function carregarConteudo() {
  const resposta = await fetch('content/site.json?_=' + Date.now());
  const dados = await resposta.json();

  // Marca
  document.getElementById('logo-mark').textContent = dados.marca.logotipo_texto;
  document.getElementById('brand-name').textContent = dados.marca.nome;
  document.getElementById('footer-nome').textContent = '© ' + new Date().getFullYear() + ' ' + dados.marca.nome;
  document.getElementById('footer-instagram').href = dados.marca.instagram;

  ['btn-agendar-header', 'btn-agendar-hero', 'btn-agendar-ticket'].forEach(id => {
    document.getElementById(id).href = dados.marca.link_agendamento;
  });

  // Hero
  document.getElementById('hero-tag').textContent = dados.hero.tag;
  document.getElementById('hero-titulo').textContent = dados.hero.titulo;
  document.getElementById('hero-subtitulo').textContent = dados.hero.subtitulo;
  document.getElementById('btn-agendar-hero').textContent = dados.hero.texto_botao;
  document.getElementById('hero-imagem').src = dados.hero.imagem;
  document.getElementById('hero-imagem').alt = dados.hero.titulo;

  // Sobre
  document.getElementById('sobre-titulo').textContent = dados.sobre.titulo;
  document.getElementById('sobre-texto').textContent = dados.sobre.texto;
  document.getElementById('sobre-imagem').src = dados.sobre.imagem;
  document.getElementById('sobre-imagem').alt = dados.sobre.titulo;

  // Serviços
  document.getElementById('servicos-titulo').textContent = dados.servicos.titulo;
  const gridServicos = document.getElementById('servicos-grid');
  gridServicos.innerHTML = '';
  dados.servicos.lista.forEach(servico => {
    const item = document.createElement('div');
    item.className = 'servico-item';
    item.innerHTML = `
      <h3>${servico.nome}</h3>
      <p>${servico.descricao}</p>
      <span class="servico-preco">${servico.preco}</span>
    `;
    gridServicos.appendChild(item);
  });

  // Galeria
  document.getElementById('galeria-titulo').textContent = dados.galeria.titulo;
  const gridGaleria = document.getElementById('galeria-grid');
  gridGaleria.innerHTML = '';
  dados.galeria.imagens.forEach(src => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    img.src = src;
    img.alt = dados.marca.nome;
    img.loading = 'lazy';
    div.appendChild(img);
    gridGaleria.appendChild(div);
  });

  // Vídeo (opcional — só aparece se o cliente colar um link do YouTube)
  if (dados.video && dados.video.url_youtube) {
    document.getElementById('video-section').style.display = '';
    document.getElementById('video-titulo').textContent = dados.video.titulo;
    const idVideo = extrairIdYoutube(dados.video.url_youtube);
    const frame = document.getElementById('video-frame');
    if (idVideo) {
      frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${idVideo}" title="${dados.video.titulo}" allowfullscreen></iframe>`;
    } else {
      frame.innerHTML = `<div class="video-fallback">Link de vídeo inválido</div>`;
    }
  }

  // Depoimentos
  document.getElementById('depoimentos-titulo').textContent = dados.depoimentos.titulo;
  const gridDepo = document.getElementById('depo-grid');
  gridDepo.innerHTML = '';
  dados.depoimentos.lista.forEach(depoimento => {
    const card = document.createElement('div');
    card.className = 'depo-card';
    card.innerHTML = `<p>“${depoimento.texto}”</p><div class="depo-nome">${depoimento.nome}</div>`;
    gridDepo.appendChild(card);
  });

  // Contato
  document.getElementById('contato-titulo').textContent = dados.contato.titulo;
  document.getElementById('contato-endereco').textContent = dados.contato.endereco;
  document.getElementById('contato-horario').textContent = dados.contato.horario;
  document.getElementById('contato-telefone').textContent = dados.contato.telefone;

  document.title = dados.marca.nome;
}

function extrairIdYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? match[1] : null;
}

carregarConteudo().catch(erro => console.error('Erro ao carregar conteúdo do site:', erro));
