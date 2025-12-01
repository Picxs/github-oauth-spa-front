# github-oauth-spa-front

Fluxo da aplicação

index.html carrega config.js e app.js
CLIENT_ID = 'PLACEHOLDER_CLIENT_ID' (local) ou valor real (produção)
App.init() detecta: não tem token → mostra tela de login

    Página principal carrega

    App verifica sessionStorage.getItem('access_token') → não existe

    Renderiza botão "Login com GitHub"

AuthUtils.startOAuthFlow() executa:
const codeVerifier = generateCodeVerifier();  // String aleatória 128 chars
const codeChallenge = await generateCodeChallenge(codeVerifier);  // SHA-256 do verifier
const state = generateState();  // String aleatória 40 chars

Armazena no sessionStorage (apenas nesta aba/sessão)
sessionStorage.setItem('pkce_code_verifier', codeVerifier);
sessionStorage.setItem('oauth_state', state);

Constrói URL de autorização:
https://github.com/login/oauth/authorize?
client_id=SEU_CLIENT_ID&
redirect_uri=https://picxs.github.io/.../callback.html&
scope=read:user%20repo&  // Pedindo permissões
response_type=code&
state=ABC123...&
code_challenge=XYZ789...&  // Hash do code_verifier
code_challenge_method=S256

Redireciona para GitHub
window.location.href = authUrl.toString();

    Gera segredo local: code_verifier (ex: aBcDeF...123)

    Transforma em desafio: code_challenge = SHA-256(code_verifier)

    Gera proteção CSRF: state aleatório

    Redireciona para GitHub com todos esses parâmetros

Usuário vê no GitHub:
"APP_NAME quer acessar sua conta"
- [ ] Ler dados do usuário
- [ ] Acessar repositórios (leitura/escrita)

[ Autorizar APP ] [ Cancelar ]

    GitHub valida client_id

    Mostra permissões solicitadas (scopes)

GitHub cria authorization_code e redireciona para:
https://picxs.github.io/.../callback.html?
code=7a8b9c0d1e2f3g4h5i6j7k8l9m0n&
state=ABC123...  // O MESMO state que enviamos
    GitHub gera um code de autorização

    Devolve exatamente o mesmo state

callback.html executa:
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');  // "7a8b9c0d1e2f3g4h5i6j7k8l9m0n"
const state = urlParams.get('state');  // "ABC123..."

VALIDAÇÃO CRÍTICA:
const storedState = sessionStorage.getItem('oauth_state');
if (state !== storedState) {
    throw new Error('Falha de segurança: State inválido');
}

Armazena temporariamente:
const authData = {
    code: code,
    code_verifier: sessionStorage.getItem('pkce_code_verifier'),
    client_id: window.CLIENT_ID
};
sessionStorage.setItem('pending_auth', JSON.stringify(authData));

Redireciona para processing.html
window.location.href = 'processing.html';

    Extrai código da URL

    Valida state contra CSRF

    Junta todos os dados necessários para troca

    Redireciona para página que fará o trabalho pesado

o processing.html faz a simulação de troca de tokens 
(que não consegui implementar corretamente)
ele determina as permissões, salva e envia todos os parâmetros
ao fechar a aba do navegador, os tokens são limpos


App.init() agora vê:
const accessToken = sessionStorage.getItem('access_token');  // EXISTE!
const userScope = sessionStorage.getItem('user_scope');      // "manager" ou "viewer"

Cria dashboard com renderização condicional
window.dashboard = new Dashboard(accessToken, userScope);

Dashboard.render() mostra
(como não é feita de fato a troca dos token com o github e sim utilizado um secret, oq vai ser carregado são os meus repositórios, que é referenciado pelo secret)

no logout
Limpa tudo localmente
sessionStorage.removeItem('access_token');
sessionStorage.removeItem('user_scope');

Volta para login
window.location.href = 'index.html';

