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
            const redirectUri = `https://picxs.github.io/github-oauth-spa-front/callback.html`;
            const scope = 'read:user repo';

            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', window.CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', scope);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            console.log('📍 Redirecionando para GitHub...' + redirectUri);
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('❌ Erro no OAuth:', error);
            alert('Erro: ' + error.message);
        }
    }

    static async getUserScopes(accessToken) {
        try {
            // Tentar fazer uma requisição para verificar permissões
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
    
            if (response.ok) {
                // Verificar escopos no header (se disponível)
                const scopesHeader = response.headers.get('x-oauth-scopes');
                console.log('Escopos concedidos:', scopesHeader);
                
                if (scopesHeader && scopesHeader.includes('repo')) {
                    return 'manager';
                }
                return 'viewer';
            }
        } catch (error) {
            console.log('Erro ao verificar escopos:', error);
        }
        
        // Fallback para o escopo armazenado
        return sessionStorage.getItem('user_scope') || 'viewer';
    }
}

// ===== DASHBOARD =====
// ===== DASHBOARD COM API REAL =====
class Dashboard {
    constructor(accessToken, userScope) {
        this.accessToken = accessToken;
        this.userScope = userScope;
        this.userInfo = null;
        this.repos = [];
    }

    async render(container) {
        await this.loadUserInfo();
        await this.loadUserRepos(); // Carrega repositórios reais
        
        const html = `
            <div class="dashboard">
                <div class="user-header">
                    <img src="${this.userInfo.avatar_url}" alt="Avatar" class="avatar">
                    <div class="user-info">
                        <h2>Bem-vindo, ${this.userInfo.name || this.userInfo.login}!</h2>
                        <p class="user-scope">Perfil: <strong>${this.userScope === 'manager' ? 'Manager' : 'Viewer'}</strong></p>
                        <p class="user-login">@${this.userInfo.login}</p>
                    </div>
                    <button id="logout-btn" class="btn-secondary">Logout</button>
                </div>
                
                <div class="dashboard-content">
                    <div class="stats-section">
                        <div class="stat-card">
                            <h3>${this.userInfo.public_repos || 0}</h3>
                            <p>Repositórios</p>
                        </div>
                        <div class="stat-card">
                            <h3>${this.userInfo.followers || 0}</h3>
                            <p>Seguidores</p>
                        </div>
                        <div class="stat-card">
                            <h3>${this.userInfo.following || 0}</h3>
                            <p>Seguindo</p>
                        </div>
                    </div>
                    
                    <div class="actions-section">
                        <h3>Ações Disponíveis</h3>
                        <div class="actions">
                            ${this.userScope === 'manager' ? 
                                `
                                <button class="btn-primary" id="view-repos-btn">📂 Meus Repositórios</button>
                                <button class="btn-primary" id="create-repo-btn">🆕 Criar Repositório</button>
                                <button class="btn-primary" id="refresh-btn">🔄 Atualizar</button>
                                ` : 
                                `
                                <button class="btn-primary" id="view-repos-btn">📂 Meus Repositórios</button>
                                <button class="btn-primary" id="view-profile-btn">👤 Meu Perfil</button>
                                <button class="btn-primary" id="refresh-btn">🔄 Atualizar</button>
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
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'GitHub-OAuth-SPA'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro API: ${response.status}`);
            }

            this.userInfo = await response.json();
            console.log('✅ Dados do usuário carregados:', this.userInfo);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do usuário:', error);
            // Fallback para dados simulados
            this.userInfo = {
                avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                name: 'Usuário GitHub',
                login: 'github-user',
                public_repos: 0,
                followers: 0,
                following: 0
            };
        }
    }

    async loadUserRepos() {
        try {
            const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'GitHub-OAuth-SPA'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro API: ${response.status}`);
            }

            this.repos = await response.json();
            console.log('✅ Repositórios carregados:', this.repos.length);
        } catch (error) {
            console.error('❌ Erro ao carregar repositórios:', error);
            this.repos = [];
        }
    }

    attachEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('view-repos-btn').addEventListener('click', () => this.viewRepositories());
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
        
        if (this.userScope === 'manager') {
            document.getElementById('create-repo-btn').addEventListener('click', () => this.createRepository());
        } else {
            document.getElementById('view-profile-btn').addEventListener('click', () => this.viewProfile());
        }
    }

    async viewRepositories() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando seus repositórios...</p>';
        
        try {
            if (this.repos.length === 0) {
                await this.loadUserRepos();
            }

            if (this.repos.length === 0) {
                results.innerHTML = `
                    <div class="empty-state">
                        <h4>📭 Nenhum repositório encontrado</h4>
                        <p>Você ainda não tem repositórios no GitHub.</p>
                        ${this.userScope === 'manager' ? 
                            '<button class="btn-primary" onclick="dashboard.createRepository()">Criar primeiro repositório</button>' : 
                            ''
                        }
                    </div>
                `;
                return;
            }

            results.innerHTML = `
                <div class="repo-list">
                    <h4>Seus Repositórios (${this.repos.length})</h4>
                    <div class="repo-grid">
                        ${this.repos.map(repo => `
                            <div class="repo-card">
                                <div class="repo-header">
                                    <h4>
                                        <a href="${repo.html_url}" target="_blank" class="repo-link">
                                            ${repo.name}
                                        </a>
                                    </h4>
                                    <span class="repo-visibility">${repo.private ? '🔒' : '🌐'}</span>
                                </div>
                                ${repo.description ? `<p class="repo-description">${repo.description}</p>` : ''}
                                <div class="repo-meta">
                                    ${repo.language ? `<span class="repo-language">${repo.language}</span>` : ''}
                                    <span class="repo-stars">⭐ ${repo.stargazers_count}</span>
                                    <span class="repo-forks">⑂ ${repo.forks_count}</span>
                                    <span class="repo-updated">📅 ${new Date(repo.updated_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            results.innerHTML = `<div class="error-message"><p>❌ Erro ao carregar repositórios: ${error.message}</p></div>`;
        }
    }

    async createRepository() {
        const repoName = prompt('Digite o nome do novo repositório:');
        if (!repoName) return;

        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Criando repositório...</p>';
        
        try {
            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'GitHub-OAuth-SPA'
                },
                body: JSON.stringify({
                    name: repoName,
                    description: 'Repositório criado via GitHub OAuth SPA',
                    private: false,
                    auto_init: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro: ${response.status}`);
            }

            const newRepo = await response.json();
            
            // Recarregar a lista de repositórios
            await this.loadUserRepos();
            
            results.innerHTML = `
                <div class="success-message">
                    <h4>✅ Repositório criado com sucesso!</h4>
                    <p><strong>${newRepo.name}</strong> foi criado no GitHub.</p>
                    <p><a href="${newRepo.html_url}" target="_blank" class="repo-link">Abrir no GitHub →</a></p>
                    <button class="btn-primary" onclick="dashboard.viewRepositories()">Ver todos os repositórios</button>
                </div>
            `;
        } catch (error) {
            results.innerHTML = `
                <div class="error-message">
                    <p>❌ Erro ao criar repositório: ${error.message}</p>
                    ${error.message.includes('name already exists') ? 
                        '<p>💡 Este nome já está em uso. Tente outro nome.</p>' : ''
                    }
                </div>
            `;
        }
    }

    async viewProfile() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando seu perfil...</p>';
        
        try {
            results.innerHTML = `
                <div class="profile-info">
                    <h4>👤 Seu Perfil GitHub</h4>
                    <div class="profile-details">
                        <p><strong>Nome:</strong> ${this.userInfo.name || 'Não informado'}</p>
                        <p><strong>Usuário:</strong> @${this.userInfo.login}</p>
                        ${this.userInfo.email ? `<p><strong>Email:</strong> ${this.userInfo.email}</p>` : ''}
                        <p><strong>Bio:</strong> ${this.userInfo.bio || 'Não informada'}</p>
                        <p><strong>Localização:</strong> ${this.userInfo.location || 'Não informada'}</p>
                        <p><strong>Repositórios públicos:</strong> ${this.userInfo.public_repos}</p>
                        <p><strong>Seguidores:</strong> ${this.userInfo.followers}</p>
                        <p><strong>Seguindo:</strong> ${this.userInfo.following}</p>
                    </div>
                    <a href="${this.userInfo.html_url}" target="_blank" class="btn-primary">Ver perfil no GitHub</a>
                </div>
            `;
        } catch (error) {
            results.innerHTML = `<div class="error-message"><p>❌ Erro ao carregar perfil: ${error.message}</p></div>`;
        }
    }

    async refreshData() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Atualizando dados...</p>';
        
        try {
            await this.loadUserInfo();
            await this.loadUserRepos();
            
            // Recarregar o dashboard para mostrar dados atualizados
            await this.render(document.getElementById('content'));
            
            results.innerHTML = '<div class="success-message"><p>✅ Dados atualizados com sucesso!</p></div>';
        } catch (error) {
            results.innerHTML = `<div class="error-message"><p>❌ Erro ao atualizar: ${error.message}</p></div>`;
        }
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

        // Expor dashboard globalmente para os event listeners
        window.dashboard = null;

        
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
            const tokenExchangeUrl = new URL('https://picxs.github.io/github-oauth-spa-front/token-exchange.html', window.location.origin);
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
        // Esta função não será mais usada pois o token-exchange.html
        // agora faz a troca real diretamente
        console.log('📝 Token exchange page - redirecionando...');
        window.location.href = 'index.html';
    }

    async showDashboard(accessToken) {
        console.log('🔐 Token de acesso:', accessToken);
        console.log('📋 Escopo:', sessionStorage.getItem('user_scope'));
        
        try {
            const userScope = await AuthUtils.getUserScopes(accessToken);
            console.log('🎯 Escopo determinado:', userScope);
            
            window.dashboard = new Dashboard(accessToken, userScope);
            await window.dashboard.render(document.getElementById('content'));
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