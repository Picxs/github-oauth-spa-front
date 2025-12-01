import AuthUtils from './auth.js';
import Dashboard from './dashboard.js';

class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 Aplicação iniciada');
        console.log('CLIENT_ID:', window.CLIENT_ID);
        
        // Verificar se estamos em páginas específicas
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('callback.html')) {
            await this.handleCallback();
            return;
        }

        if (currentPath.includes('token-exchange.html')) {
            await this.handleTokenExchange();
            return;
        }

        // Página principal - verificar autenticação
        await this.showAppropriateView();
    }

    async showAppropriateView() {
        const accessToken = sessionStorage.getItem('access_token');
        
        if (accessToken) {
            await this.showDashboard(accessToken);
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="login-container">
                <h2>Bem-vindo</h2>
                <p>Gerencie seus repositórios do GitHub com segurança</p>
                <button id="login-btn" class="btn-primary">Login com GitHub</button>
                <div class="features">
                    <h3>Funcionalidades:</h3>
                    <ul>
                        <li>🔍 Visualizar repositórios (Viewer)</li>
                        <li>⚡ Criar repositórios (Manager)</li>
                        <li>🔒 Autenticação segura OAuth 2.0 PKCE</li>
                    </ul>
                </div>
            </div>
        `;

        document.getElementById('login-btn').addEventListener('click', () => {
            AuthUtils.startOAuthFlow();
        });
    }

    async handleCallback() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="login-container">
                <h2>Processando autenticação...</h2>
                <div class="loading-spinner"></div>
                <p id="status">Validando...</p>
            </div>
        `;

        const statusEl = document.getElementById('status');
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        try {
            if (error) {
                throw new Error(`Erro de autorização: ${error}`);
            }

            if (!code) {
                throw new Error('Código de autorização não recebido');
            }

            // Validar state (CSRF protection)
            const storedState = sessionStorage.getItem('oauth_state');
            if (state !== storedState) {
                throw new Error('Falha de segurança: State inválido');
            }

            statusEl.textContent = 'Preparando exchange de token...';

            // Redirecionar para token-exchange.html com os parâmetros
            const tokenExchangeUrl = new URL('token-exchange.html', window.location.origin);
            tokenExchangeUrl.searchParams.set('code', code);
            tokenExchangeUrl.searchParams.set('code_verifier', sessionStorage.getItem('pkce_code_verifier'));
            tokenExchangeUrl.searchParams.set('client_id', window.CLIENT_ID);
            tokenExchangeUrl.searchParams.set('redirect_uri', window.location.href.split('?')[0]);

            window.location.href = tokenExchangeUrl.toString();

        } catch (error) {
            console.error('Erro no callback:', error);
            statusEl.textContent = 'Erro: ' + error.message;
            statusEl.style.color = 'red';
            
            sessionStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    }

    async handleTokenExchange() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="login-container">
                <h2>Finalizando autenticação...</h2>
                <div class="loading-spinner"></div>
                <p id="status">Processando token de acesso...</p>
            </div>
        `;

        const statusEl = document.getElementById('status');

        try {
            statusEl.textContent = 'Token recebido! Configurando sessão...';

            // Simular obtenção do token (em produção, isso viria do GitHub)
            const mockAccessToken = "gho_mock_" + Math.random().toString(36).substr(2, 20);
            const userScope = Math.random() > 0.5 ? 'manager' : 'viewer';
            
            // Armazenar token e escopo
            sessionStorage.setItem('access_token', mockAccessToken);
            sessionStorage.setItem('user_scope', userScope);
            
            // Limpar dados temporários
            sessionStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');
            
            statusEl.textContent = 'Autenticação concluída! Redirecionando...';
            
            // Redirecionar para página principal (que mostrará o dashboard)
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('Erro no token exchange:', error);
            statusEl.textContent = 'Erro: ' + error.message;
            statusEl.style.color = 'red';
            
            sessionStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    }

    async showDashboard(accessToken) {
        try {
            const userScope = await AuthUtils.getUserScopes(accessToken);
            const dashboard = new Dashboard(accessToken, userScope);
            await dashboard.render(document.getElementById('content'));
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user_scope');
            this.showLogin();
        }
    }
}

// Inicializar aplicação quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}