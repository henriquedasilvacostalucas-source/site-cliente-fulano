module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;

  if (!clientId) {
    res.status(500).send('OAUTH_CLIENT_ID não configurado nas variáveis de ambiente da Vercel.');
    return;
  }

  const redirectUri = `https://${req.headers.host}/api/callback`;
  const scope = 'repo,user';

  const authorizeUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.writeHead(302, { Location: authorizeUrl });
  res.end();
};
