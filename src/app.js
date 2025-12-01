// src/app.js - APLICAÇÃO COMPLETA SEM IMPORTS EXTERNOS

// ===== AUTH UTILS =====
class AuthUtils {
    static generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    static generateCodeVerifier() {
        return this.generateRandomString(128);
    }

    static async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    static generateState() {
        return this.generateRandomString(40);
    }

    static async startOAuthFlow() {
        try {
            console.log('🔐 Iniciando OAuth com CLIENT_ID:', window.CLIENT_ID);
            
            if (!window.CLIENT_ID || window.CLIENT_ID === 'PLACEHOLDER_CLIENT_ID') {
                throw new Error('CLIENT_ID não configurado');
            }

            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateState();

            sessionStorage.setItem('pkce_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_state', state);
            const redirectUri = `${window.location.origin} /github-oauth-spa-front/callback.html`;
            console.log(redirectUri);
            const scope = 'read:user repo';

            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', window.CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', 'https://picxs.github.io/github-oauth-spa-front/callback.html');
            authUrl.searchParams.set('scope', scope);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            console.log('📍 Redirecionando para GitHub...');
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('❌ Erro no OAuth:', error);
            alert('Erro: ' + error.message);
        }
    }

    static async getUserScopes(accessToken) {
        return sessionStorage.getItem('user_scope') || 'viewer';
    }
}

// ===== DASHBOARD =====
class Dashboard {
    constructor(accessToken, userScope) {
        this.accessToken = accessToken;
        this.userScope = userScope;
        this.userInfo = null;
    }

    async render(container) {
        await this.loadUserInfo();
        
        const html = `
            <div class="dashboard">
                <div class="user-header">
                    <img src="${this.userInfo.avatar_url}" alt="Avatar" class="avatar">
                    <div class="user-info">
                        <h2>Bem-vindo, ${this.userInfo.name || this.userInfo.login}!</h2>
                        <p class="user-scope">Perfil: <strong>${this.userScope === 'manager' ? 'Manager' : 'Viewer'}</strong></p>
                    </div>
                    <button id="logout-btn" class="btn-secondary">Logout</button>
                </div>
                
                <div class="dashboard-content">
                    <div class="actions-section">
                        <h3>Ações Disponíveis</h3>
                        <div class="actions">
                            ${this.userScope === 'manager' ? 
                                `
                                <button class="btn-primary" id="view-repos-btn">📂 Ver Repositórios</button>
                                <button class="btn-primary" id="create-repo-btn">🆕 Criar Repositório</button>
                                <button class="btn-primary" id="manage-repos-btn">⚙️ Gerenciar Repositórios</button>
                                ` : 
                                `
                                <button class="btn-primary" id="view-repos-btn">📂 Ver Repositórios</button>
                                <button class="btn-primary" id="view-profile-btn">👤 Ver Perfil</button>
                                `
                            }
                        </div>
                    </div>
                    
                    <div class="results-section">
                        <h3>Resultados</h3>
                        <div id="results" class="results">
                            <p>Clique em uma ação para ver os resultados...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners();
    }

    async loadUserInfo() {
        // Simular dados do usuário
        this.userInfo = {
            avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            name: 'Usuário GitHub',
            login: 'github-user'
        };
    }

    attachEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('view-repos-btn').addEventListener('click', () => this.viewRepositories());
        
        if (this.userScope === 'manager') {
            document.getElementById('create-repo-btn').addEventListener('click', () => this.createRepository());
            document.getElementById('manage-repos-btn').addEventListener('click', () => this.manageRepositories());
        } else {
            document.getElementById('view-profile-btn').addEventListener('click', () => this.viewProfile());
        }
    }

    async viewRepositories() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando repositórios...</p>';
        
        setTimeout(() => {
            const repos = [
                { name: 'meu-projeto', language: 'JavaScript', stars: 15, private: false },
                { name: 'api-backend', language: 'Python', stars: 8, private: true },
                { name: 'docs', language: 'Markdown', stars: 3, private: false },
                { name: 'mobile-app', language: 'TypeScript', stars: 22, private: false }
            ];
            
            results.innerHTML = `
                <div class="repo-list">
                    <h4>Seus Repositórios (${repos.length})</h4>
                    ${repos.map(repo => `
                        <div class="repo-card">
                            <h4>${repo.name}</h4>
                            <p>Linguagem: ${repo.language} | ⭐ ${repo.stars} | ${repo.private ? '🔒 Privado' : '🌐 Público'}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }, 1500);
    }

    async createRepository() {
        const repoName = prompt('Nome do repositório:');
        if (repoName) {
            const results = document.getElementById('results');
            results.innerHTML = '<div class="loading-spinner"></div><p>Criando repositório...</p>';
            
            setTimeout(() => {
                results.innerHTML = `
                    <div class="success-message">
                        <h4>✅ Repositório criado com sucesso!</h4>
                        <p><strong>${repoName}</strong> foi criado no GitHub.</p>
                        <p>URL: https://github.com/seu-usuario/${repoName}</p>
                    </div>
                `;
            }, 2000);
        }
    }

    async manageRepositories() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando opções de gerenciamento...</p>';
        
        setTimeout(() => {
            results.innerHTML = `
                <div class="manager-actions">
                    <h4>⚙️ Ações de Gerenciamento (Manager)</h4>
                    <div class="action-buttons">
                        <button class="btn-secondary" onclick="alert('Configurações do repositório')">Configurações</button>
                        <button class="btn-secondary" onclick="alert('Gerenciar colaboradores')">Colaboradores</button>
                        <button class="btn-secondary" onclick="alert('Configurar webhooks')">Webhooks</button>
                    </div>
                    <p>Funcionalidade disponível apenas para usuários Manager.</p>
                </div>
            `;
        }, 1500);
    }

    async viewProfile() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando perfil...</p>';
        
        setTimeout(() => {
            results.innerHTML = `
                <div class="profile-info">
                    <h4>👤 Informações do Perfil (Viewer)</h4>
                    <p><strong>Nome:</strong> Usuário GitHub</p>
                    <p><strong>Email:</strong> usuario@example.com</p>
                    <p><strong>Plano:</strong> GitHub Free</p>
                    <p><strong>Repositórios públicos:</strong> 15</p>
                    <p><strong>Seguidores:</strong> 42</p>
                </div>
            `;
        }, 1500);
    }

    logout() {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user_scope');
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');
        window.location.href = 'index.html';
    }
}

// ===== MAIN APP =====
class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 Aplicação iniciada - CLIENT_ID:', window.CLIENT_ID);
        
        // Verificar página atual
        const path = window.location.pathname;
        
        if (path.includes('callback.html')) {
            await this.handleCallback();
            return;
        }

        if (path.includes('token-exchange.html')) {
            await this.handleTokenExchange();
            return;
        }

        // Página principal
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

            // Redirecionar para token-exchange.html
            const tokenExchangeUrl = new URL('token-exchange.html', window.location.origin);
            tokenExchangeUrl.searchParams.set('code', code);
            tokenExchangeUrl.searchParams.set('code_verifier', sessionStorage.getItem('pkce_code_verifier'));
            tokenExchangeUrl.searchParams.set('client_id', window.CLIENT_ID);
            tokenExchangeUrl.searchParams.set('redirect_uri', window.location.href.split('?')[0]);

            window.location.href = tokenExchangeUrl.toString();

        } catch (error) {
            console.error('❌ Erro no callback:', error);
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

            // Simular obtenção do token
            const mockAccessToken = "gho_mock_" + Math.random().toString(36).substr(2, 20);
            const userScope = Math.random() > 0.5 ? 'manager' : 'viewer';
            
            // Armazenar token e escopo
            sessionStorage.setItem('access_token', mockAccessToken);
            sessionStorage.setItem('user_scope', userScope);
            
            // Limpar dados temporários
            sessionStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');
            
            statusEl.textContent = 'Autenticação concluída! Redirecionando...';
            
            // Redirecionar para página principal
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Erro no token exchange:', error);
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
            console.error('❌ Erro ao carregar dashboard:', error);
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user_scope');
            this.showLogin();
        }
    }
}

// ===== INICIALIZAÇÃO =====
console.log('📦 Carregando aplicação...');
document.addEventListener('DOMContentLoaded', () => {
    new App();
});