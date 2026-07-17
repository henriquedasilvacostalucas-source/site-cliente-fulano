module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    res.status(400).send('Código de autorização ausente.');
    return;
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      res.status(401).send(renderScript('error', tokenData));
      return;
    }

    res.status(200).send(
      renderScript('success', { token: tokenData.access_token, provider: 'github' })
    );
  } catch (err) {
    res.status(500).send(renderScript('error', { message: err.message }));
  }
};

// Envia o resultado do login de volta para a janela do painel de edição (Decap CMS),
// seguindo o protocolo esperado pelo Decap CMS para provedores OAuth externos.
function renderScript(status, content) {
  return `<html><body><script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify(content)}',
        e.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
  </script></body></html>`;
}
