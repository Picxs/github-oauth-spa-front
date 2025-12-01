import GitHubAPI from '../utils/githubApi.js';

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
                    <script>
                        window.CLIENT_ID = 'PLACEHOLDER_CLIENT_ID';
                    </script>
                    <img src="${this.userInfo.avatar_url}" alt="Avatar" class="avatar">
                    <h2>Bem-vindo, ${this.userInfo.name || this.userInfo.login}!</h2>
                    <p>Permissão: ${this.userScope === 'manager' ? 'Manager' : 'Viewer'}</p>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
                
                <div class="repos-section">
                    <div class="section-header">
                        <h3>Seus Repositórios</h3>
                        ${this.userScope === 'manager' ? 
                            '<button id="create-repo-btn" class="btn btn-primary">Criar Novo Repositório</button>' : 
                            ''
                        }
                    </div>
                    <div id="repos-list" class="repos-list"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        await this.loadRepositories();
        this.attachEventListeners();
    }

    async loadUserInfo() {
        this.userInfo = await this.githubAPI.getUserInfo();
    }

    async loadRepositories() {
        const repos = await this.githubAPI.getUserRepos();
        const reposList = document.getElementById('repos-list');
        
        const reposHtml = repos.map(repo => `
            <div class="repo-card">
                <h4>${repo.name}</h4>
                <p>${repo.description || 'Sem descrição'}</p>
                <div class="repo-meta">
                    <span class="language">${repo.language || 'N/A'}</span>
                    <span class="stars">⭐ ${repo.stargazers_count}</span>
                    <span class="visibility">${repo.private ? '🔒 Privado' : '🌐 Público'}</span>
                </div>
                <a href="${repo.html_url}" target="_blank" class="repo-link">Abrir no GitHub</a>
            </div>
        `).join('');

        reposList.innerHTML = reposHtml;
    }

    attachEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        if (this.userScope === 'manager') {
            document.getElementById('create-repo-btn').addEventListener('click', () => {
                this.showCreateRepoModal();
            });
        }
    }

    showCreateRepoModal() {
        const repoName = prompt('Nome do novo repositório:');
        if (repoName) {
            this.createRepository(repoName);
        }
    }

    async createRepository(repoName) {
        try {
            const result = await this.githubAPI.createRepository(repoName);
            alert(`Repositório "${repoName}" criado com sucesso!`);
            await this.loadRepositories(); // Recarregar lista
        } catch (error) {
            alert('Erro ao criar repositório: ' + error.message);
        }
    }

    logout() {
        // Limpar tokens (Requisito C)
        sessionStorage.removeItem('code_verifier');
        sessionStorage.removeItem('oauth_state');
        
        // Redirecionar para logout do GitHub
        window.location.href = 'https://github.com/logout';
    }
}

export default Dashboard;