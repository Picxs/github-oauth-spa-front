class GitHubAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }

    async getUserInfo() {
        // Simular API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                    name: 'Usuário GitHub',
                    login: 'github-user'
                });
            }, 500);
        });
    }

    async getUserRepos() {
        // Simular API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { name: 'meu-projeto', language: 'JavaScript', stars: 15, private: false },
                    { name: 'api-backend', language: 'Python', stars: 8, private: true }
                ]);
            }, 1000);
        });
    }

    async createRepository(repoName) {
        // Simular API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    name: repoName,
                    html_url: `https://github.com/seu-usuario/${repoName}`,
                    private: false
                });
            }, 1500);
        });
    }
}

export default GitHubAPI;