// src/app.js - APLICAÇÃO COMPLETA SEM IMPORTS EXTERNOS

const CONFIG = {
    clientId: window.CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
    githubPat: window.GITHUB_PAT,
    realDataMode: window.REAL_DATA_MODE || false
};

console.log('🔧 Configuração:', {
    clientId: CONFIG.clientId ? '✅ Configurado' : '❌ Não configurado',
    realDataMode: CONFIG.realDataMode,
    hasPat: !!CONFIG.githubPat
});


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
        if (!container) {
            throw new Error('Container não fornecido para renderização');
        }
        
        console.log('🎨 Renderizando dashboard no container:', container);
        try {
            await this.loadUserInfo();
            await this.loadUserRepos();
            
            const isRealData = CONFIG.realDataMode && CONFIG.githubPat && CONFIG.githubPat !== 'PLACEHOLDER_PAT';
            
            const html = `
                <div class="dashboard">
                    <!-- Banner indicando modo -->
                    <div class="${isRealData ? 'real-banner' : 'demo-banner'}">
                        <p>${isRealData ? '✅' : '🚀'} <strong>Modo ${isRealData ? 'REAL' : 'Demonstração'}:</strong> 
                           ${isRealData ? 'Dados reais do seu GitHub' : 'Dados simulados para fins educacionais'}</p>
                    </div>
                    
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
    
            // Renderizar o HTML primeiro
            container.innerHTML = html;
            
            // Aguardar um tick do event loop para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Agora anexar os event listeners
            this.attachEventListeners();
            
            console.log('✅ Dashboard renderizado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao renderizar dashboard:', error);
            throw error;
        }
    }

    async loadUserInfo() {
        try {
            // Tentar dados reais primeiro
            if (CONFIG.realDataMode && CONFIG.githubPat && CONFIG.githubPat !== 'PLACEHOLDER_PAT') {
                console.log('🔍 Tentando carregar dados reais do GitHub...');
                
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${CONFIG.githubPat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'GitHub-OAuth-SPA'
                    }
                });
    
                if (response.ok) {
                    this.userInfo = await response.json();
                    console.log('✅ Dados REAIS do usuário carregados:', this.userInfo);
                    return;
                } else {
                    console.warn('⚠️ Falha ao carregar dados reais, usando dados simulados');
                }
            }
    
            // Fallback para dados simulados
            console.log('🎭 Usando dados simulados');
            const isManager = this.userScope === 'manager';
            
            this.userInfo = {
                avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                name: isManager ? 'GitHub Manager' : 'GitHub Viewer',
                login: isManager ? 'github-manager' : 'github-viewer',
                public_repos: isManager ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 5) + 1,
                followers: isManager ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 10) + 1,
                following: Math.floor(Math.random() * 30) + 5,
                bio: isManager ? 'Desenvolvedor com acesso completo aos repositórios' : 'Visualizador de repositórios',
                location: 'Internet',
                html_url: 'https://github.com',
                email: isManager ? 'manager@example.com' : 'viewer@example.com'
            };
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados do usuário:', error);
            // Fallback básico
            this.userInfo = {
                avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                name: 'Usuário GitHub',
                login: 'github-user',
                public_repos: 0,
                followers: 0,
                following: 0,
                bio: 'Usuário do GitHub',
                location: 'Internet',
                html_url: 'https://github.com'
            };
        }
    }
    
    async loadUserRepos() {
        try {
            // Tentar dados reais primeiro
            if (CONFIG.realDataMode && CONFIG.githubPat && CONFIG.githubPat !== 'PLACEHOLDER_PAT') {
                console.log('🔍 Tentando carregar repositórios reais...');
                
                const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
                    headers: {
                        'Authorization': `token ${CONFIG.githubPat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'GitHub-OAuth-SPA'
                    }
                });
    
                if (response.ok) {
                    this.repos = await response.json();
                    console.log('✅ Repositórios REAIS carregados:', this.repos.length);
                    return;
                } else {
                    console.warn('⚠️ Falha ao carregar repositórios reais, usando dados simulados');
                }
            }
    
            // Fallback para dados simulados
            console.log('🎭 Usando repositórios simulados');
            const isManager = this.userScope === 'manager';
            
            const baseRepos = [
                { 
                    name: 'meu-projeto', 
                    language: 'JavaScript', 
                    description: 'Meu projeto principal de desenvolvimento web',
                    private: false
                },
                { 
                    name: 'api-backend', 
                    language: 'Python', 
                    description: 'API RESTful para aplicação backend',
                    private: true 
                }
            ];
            
            this.repos = baseRepos.map((repo, index) => ({
                name: repo.name,
                language: repo.language,
                description: repo.description,
                stargazers_count: Math.floor(Math.random() * 25),
                forks_count: Math.floor(Math.random() * 12),
                private: repo.private,
                html_url: `https://github.com/seu-usuario/${repo.name}`,
                updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            }));
            
        } catch (error) {
            console.error('❌ Erro ao carregar repositórios:', error);
            this.repos = [];
        }
    }

    attachEventListeners() {
        try {
            console.log('🔗 Anexando event listeners...');
            
            const logoutBtn = document.getElementById('logout-btn');
            const viewReposBtn = document.getElementById('view-repos-btn');
            const refreshBtn = document.getElementById('refresh-btn');
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.logout());
                console.log('✅ Logout listener anexado');
            } else {
                console.warn('⚠️  Botão logout não encontrado');
            }
            
            if (viewReposBtn) {
                viewReposBtn.addEventListener('click', () => this.viewRepositories());
                console.log('✅ View repos listener anexado');
            } else {
                console.warn('⚠️  Botão view repos não encontrado');
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshData());
                console.log('✅ Refresh listener anexado');
            } else {
                console.warn('⚠️  Botão refresh não encontrado');
            }
            
            if (this.userScope === 'manager') {
                const createRepoBtn = document.getElementById('create-repo-btn');
                if (createRepoBtn) {
                    createRepoBtn.addEventListener('click', () => this.createRepository());
                    console.log('✅ Create repo listener anexado');
                } else {
                    console.warn('⚠️  Botão create repo não encontrado');
                }
            } else {
                const viewProfileBtn = document.getElementById('view-profile-btn');
                if (viewProfileBtn) {
                    viewProfileBtn.addEventListener('click', () => this.viewProfile());
                    console.log('✅ View profile listener anexado');
                } else {
                    console.warn('⚠️  Botão view profile não encontrado');
                }
            }
            
            console.log('🎯 Todos os event listeners anexados');
        } catch (error) {
            console.error('❌ Erro ao anexar event listeners:', error);
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
            // Tentar criar repositório real se PAT estiver disponível
            if (CONFIG.realDataMode && CONFIG.githubPat && CONFIG.githubPat !== 'PLACEHOLDER_PAT') {
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${CONFIG.githubPat}`,
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
    
                if (response.ok) {
                    const newRepo = await response.json();
                    
                    // Recarregar repositórios reais
                    await this.loadUserRepos();
                    
                    results.innerHTML = `
                        <div class="success-message">
                            <h4>✅ Repositório criado com sucesso!</h4>
                            <p><strong>${newRepo.name}</strong> foi criado no GitHub.</p>
                            <p><a href="${newRepo.html_url}" target="_blank" class="repo-link">Abrir no GitHub →</a></p>
                            <button class="btn-primary" onclick="dashboard.viewRepositories()">Ver todos os repositórios</button>
                        </div>
                    `;
                    return;
                }
            }
    
            // Fallback para simulação
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const newRepo = {
                name: repoName,
                html_url: `https://github.com/seu-usuario/${repoName}`,
                private: false,
                description: 'Repositório criado via GitHub OAuth SPA'
            };
            
            this.repos.unshift({
                ...newRepo,
                language: 'JavaScript',
                stargazers_count: 0,
                forks_count: 0,
                updated_at: new Date().toISOString()
            });
            
            results.innerHTML = `
                <div class="success-message">
                    <h4>✅ Repositório SIMULADO criado!</h4>
                    <p><strong>${newRepo.name}</strong> (modo demonstração)</p>
                    <button class="btn-primary" onclick="dashboard.viewRepositories()">Ver repositórios</button>
                </div>
            `;
            
        } catch (error) {
            results.innerHTML = `
                <div class="error-message">
                    <p>❌ Erro ao criar repositório: ${error.message}</p>
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
    
    // Verificar página atual
    const path = window.location.pathname;
    
    if (path.includes('callback.html')) {
        // O callback.html agora redireciona para processing.html
        return;
    }

    if (path.includes('processing.html')) {
        // O processing.html já tem seu próprio script
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
        try {
            const userScope = await AuthUtils.getUserScopes(accessToken);
            console.log('🎯 Escopo determinado:', userScope);
            
            window.dashboard = new Dashboard(accessToken, userScope);
            
            const contentElement = document.getElementById('content');
            if (!contentElement) {
                throw new Error('Elemento #content não encontrado no DOM');
            }
            
            await window.dashboard.render(contentElement);
            console.log('✅ Dashboard carregado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error);
            
            // Mostrar erro amigável para o usuário
            const contentElement = document.getElementById('content');
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="error-container">
                        <h2>😕 Erro ao carregar dashboard</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" class="btn-primary">Tentar novamente</button>
                        <button onclick="sessionStorage.clear(); location.href='index.html'" class="btn-secondary">Fazer logout</button>
                    </div>
                `;
            }
            
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user_scope');
        }
    }
}

// ===== INICIALIZAÇÃO =====
console.log('📦 Carregando aplicação...');
document.addEventListener('DOMContentLoaded', () => {
    new App();
});