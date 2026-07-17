# Site editável (exemplo) — Studio Bela

Este é um modelo de site que você pode reaproveitar para cada cliente. Ele tem duas partes:

1. **O site** (`index.html`, `style.css`, `script.js`) — o que o visitante vê.
2. **O painel de edição** (pasta `admin/`) — onde o cliente edita texto, fotos e vídeo sozinho, sem tocar em código.

Todo o conteúdo (textos, fotos, vídeo, preços, depoimentos) fica em um único arquivo: `content/site.json`. O site lê esse arquivo automaticamente. O painel de edição só existe para editar esse arquivo de um jeito visual, com formulários.

---

## Passo 1 — Subir para o GitHub

1. Crie uma conta em [github.com](https://github.com) (se ainda não tiver).
2. Crie um repositório novo (ex: `site-cliente-fulano`), público.
3. Suba todos os arquivos desta pasta para esse repositório (pode arrastar e soltar na própria interface do GitHub, em "Add file → Upload files", ou usar Git).

## Passo 2 — Publicar com GitHub Pages (domínio grátis)

1. No repositório, vá em **Settings → Pages**.
2. Em "Source", selecione a branch `main` e a pasta `/ (root)`.
3. Salve. Em ~1 minuto o GitHub te dá uma URL do tipo:
   `https://seu-usuario.github.io/site-cliente-fulano/`

Esse é o link gratuito que você vai colar na Versum (perfil do salão → site/link externo).

## Passo 3 — Ativar o painel de edição para o cliente

O painel (`/admin`) usa o **Decap CMS**, que edita o conteúdo direto no seu repositório GitHub. Para o login funcionar, o GitHub exige uma autenticação OAuth — não dá pra fazer isso só com arquivos estáticos, é preciso um pequeno "intermediário" de login. Duas formas simples:

**Opção recomendada — hospedar via Netlify (grátis), mantendo o código no GitHub:**
1. Crie uma conta grátis em [netlify.com](https://netlify.com) e conecte o mesmo repositório do GitHub.
2. Netlify publica o site automaticamente (também gera uma URL grátis, ex: `site-fulano.netlify.app` — você pode usar essa como link na Versum em vez da do GitHub Pages).
3. Em **Site settings → Identity**, clique em "Enable Identity", e em "Services → Git Gateway" clique em "Enable Git Gateway". Isso resolve o login sem você precisar configurar nada de OAuth manualmente.
4. Convide seu cliente por e-mail em **Identity → Invite users**. Ele recebe um convite, cria uma senha, e a partir daí acessa `seusite.netlify.app/admin` para editar.

**Opção alternativa — manter 100% no GitHub Pages:**
Dá pra fazer sem o Netlify, mas exige subir um pequeno serviço de autenticação OAuth à parte (ex: um provedor OAuth gratuito para Decap CMS). É mais técnico — se preferir esse caminho eu te ajudo a configurar quando chegar a hora.

## Passo 4 — Editar o config.yml

Abra `admin/config.yml` e troque:
```yaml
repo: SEU-USUARIO/SEU-REPOSITORIO
```
pelo usuário e nome reais do repositório no GitHub.

## Passo 5 — Linkar na Versum

Dentro do painel da Versum, no perfil do salão/profissional, adicione a URL do site (a do GitHub Pages ou do Netlify, tanto faz) no campo de link/site do estabelecimento. Como a Versum já tem o próprio sistema de agendamento, deixei um campo `link_agendamento` no `site.json` — aponte ele para a página de agendamento da Versum do cliente, assim os botões "Agendar" do site levam direto pra lá.

---

## Como o cliente edita depois de pronto

O cliente acessa `seusite.netlify.app/admin` (ou a URL equivalente), faz login, e vê um formulário com:
- Nome do salão, WhatsApp, Instagram, link de agendamento
- Título e foto de capa
- Texto "sobre"
- Lista de serviços (nome, descrição, preço) — pode adicionar/remover itens
- Fotos da galeria — pode adicionar/remover
- Link de um vídeo do YouTube (opcional)
- Depoimentos
- Dados de contato

Ele preenche, clica em "Publish", e o site atualiza sozinho em cerca de 1 minuto. Nenhum código é tocado.

## Para reaproveitar em outro cliente

Duplique este repositório (GitHub tem "Use this template" se você marcar como template, ou "Fork"), troque as cores em `style.css` (variáveis no topo do arquivo), o conteúdo inicial em `content/site.json`, e repita os passos 1 a 5.
