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
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateState();

            // Armazenar no sessionStorage (Requisito C)
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_state', state);

            // CLIENT_ID será injetado pelo GitHub Actions
            const clientId = window.CLIENT_ID;
            const redirectUri = `${window.location.origin}/callback.html`;
            
            // Scopes para diferenciar Viewer vs Manager
            const scope = 'read:user repo';

            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', clientId);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', scope);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Erro no fluxo OAuth:', error);
            alert('Erro ao iniciar login: ' + error.message);
        }
    }

    static async verifyScopes(accessToken) {
        try {
            // Testar operação de escrita para verificar se é Manager
            const response = await fetch('https://api.github.com/user/repos', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const repos = await response.json();
                
                // Verificar escopos no header da resposta
                const scopesHeader = response.headers.get('x-oauth-scopes');
                console.log('Scopes concedidos:', scopesHeader);
                
                if (scopesHeader && scopesHeader.includes('repo')) {
                    return 'manager';
                }
                return 'viewer';
            }
        } catch (error) {
            console.error('Erro ao verificar escopos:', error);
        }
        return 'viewer';
    }

    static logout() {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user_scope');
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');
        window.location.href = '/';
    }
}

export default AuthUtils;