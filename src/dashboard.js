import GitHubAPI from './githubApi.js';

class Dashboard {
    constructor(accessToken, userScope) {
        this.accessToken = accessToken;
        this.userScope = userScope;
        this.githubAPI = new GitHubAPI(accessToken);
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
        // Simular dados do usuário para demonstração
        this.userInfo = {
            avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            name: 'Usuário GitHub',
            login: 'github-user'
        };
        
        // Em produção real, você usaria:
        // this.userInfo = await this.githubAPI.getUserInfo();
    }

    attachEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('view-repos-btn').addEventListener('click', () => {
            this.viewRepositories();
        });

        if (this.userScope === 'manager') {
            document.getElementById('create-repo-btn').addEventListener('click', () => {
                this.createRepository();
            });
            document.getElementById('manage-repos-btn').addEventListener('click', () => {
                this.manageRepositories();
            });
        } else {
            document.getElementById('view-profile-btn').addEventListener('click', () => {
                this.viewProfile();
            });
        }
    }

    async viewRepositories() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando repositórios...</p>';
        
        try {
            // Simular carregamento
            await new Promise(resolve => setTimeout(resolve, 1500));
            
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
        } catch (error) {
            results.innerHTML = `<p class="error">Erro ao carregar repositórios: ${error.message}</p>`;
        }
    }

    async createRepository() {
        const repoName = prompt('Digite o nome do novo repositório:');
        if (repoName) {
            const results = document.getElementById('results');
            results.innerHTML = '<div class="loading-spinner"></div><p>Criando repositório...</p>';
            
            try {
                // Simular criação
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                results.innerHTML = `
                    <div class="success-message">
                        <h4>✅ Repositório criado com sucesso!</h4>
                        <p><strong>${repoName}</strong> foi criado no GitHub.</p>
                        <p>URL: https://github.com/seu-usuario/${repoName}</p>
                    </div>
                `;
            } catch (error) {
                results.innerHTML = `<p class="error">Erro ao criar repositório: ${error.message}</p>`;
            }
        }
    }

    async manageRepositories() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando opções de gerenciamento...</p>';
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
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
        } catch (error) {
            results.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
        }
    }

    async viewProfile() {
        const results = document.getElementById('results');
        results.innerHTML = '<div class="loading-spinner"></div><p>Carregando perfil...</p>';
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
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
        } catch (error) {
            results.innerHTML = `<p class="error">Erro ao carregar perfil: ${error.message}</p>`;
        }
    }

    logout() {
        // Limpar dados da sessão (Requisito C)
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user_scope');
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');
        
        // Redirecionar para página inicial
        window.location.href = 'index.html';
    }
}

export default Dashboard;