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

## Passo 2 — Publicar na Vercel (domínio grátis)

1. Crie uma conta grátis em [vercel.com](https://vercel.com) (dá pra entrar direto com o GitHub).
2. Clique em **Add New → Project** e selecione o repositório que você acabou de subir.
3. Deixe tudo como está (é um site estático, não precisa configurar build) e clique em **Deploy**.
4. Em ~1 minuto a Vercel te entrega uma URL grátis, algo como:
   `https://site-cliente-fulano.vercel.app`

Esse é o link que você vai colar na Versum (perfil do salão → site/link externo).

## Passo 3 — Ativar o login do painel de edição (GitHub OAuth)

O painel (`/admin`) usa o **Decap CMS**, que grava as edições direto no seu repositório GitHub. Isso exige um login autenticado — por isso o projeto já vem com duas funções prontas em `api/auth.js` e `api/callback.js`, que a própria Vercel roda como funções serverless. Você só precisa criar as credenciais:

1. No GitHub, vá em **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Preencha:
   - **Application name**: qualquer nome, ex. "Site Fulano - Editor"
   - **Homepage URL**: a URL do seu projeto na Vercel (ex: `https://site-cliente-fulano.vercel.app`)
   - **Authorization callback URL**: a mesma URL + `/api/callback` (ex: `https://site-cliente-fulano.vercel.app/api/callback`)
3. Clique em **Register application**. Ele vai te dar um **Client ID**, e em seguida você gera um **Client Secret** (botão "Generate a new client secret").
4. Volte pro projeto na Vercel → **Settings → Environment Variables** e adicione:
   - `OAUTH_CLIENT_ID` = o Client ID que o GitHub gerou
   - `OAUTH_CLIENT_SECRET` = o Client Secret que o GitHub gerou
5. Clique em **Redeploy** no projeto (Settings → Deployments → ⋯ → Redeploy) para as variáveis entrarem em vigor.

A partir daí, `seusite.vercel.app/admin` já tem um botão "Login with GitHub" funcionando. Quem tiver acesso de colaborador ao repositório no GitHub consegue logar e editar — para o cliente editar, adicione o e-mail/usuário dele como colaborador do repositório em **Settings → Collaborators** no GitHub.

## Passo 4 — Editar o config.yml

Abra `admin/config.yml` e troque:
```yaml
repo: SEU-USUARIO/SEU-REPOSITORIO
base_url: https://SEU-PROJETO.vercel.app
```
pelos valores reais do seu repositório e da URL que a Vercel te deu. Depois de editar, suba a alteração:
```bash
git add .
git commit -m "Configura repositorio e URL da Vercel"
git push
```
A Vercel republica automaticamente a cada push.

## Passo 5 — Linkar na Versum

Dentro do painel da Versum, no perfil do salão/profissional, adicione a URL do site (a que a Vercel te deu) no campo de link/site do estabelecimento. Como a Versum já tem o próprio sistema de agendamento, deixei um campo `link_agendamento` no `site.json` — aponte ele para a página de agendamento da Versum do cliente, assim os botões "Agendar" do site levam direto pra lá.

---

## Como o cliente edita depois de pronto

O cliente acessa `seusite.vercel.app/admin`, faz login com a conta GitHub que você liberou como colaboradora, e vê um formulário com:
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
