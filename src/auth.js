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
            console.log('CLIENT_ID no auth:', window.CLIENT_ID);
            
            if (!window.CLIENT_ID || window.CLIENT_ID === 'PLACEHOLDER_CLIENT_ID') {
                throw new Error('CLIENT_ID não configurado. Verifique o GitHub Actions.');
            }

            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateState();

            // Armazenar no sessionStorage
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_state', state);

            const redirectUri = `${window.location.origin}/callback.html`;
            const scope = 'read:user repo';

            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', window.CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', scope);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            console.log('Redirecionando para GitHub OAuth...');
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Erro no OAuth flow:', error);
            alert('Erro: ' + error.message);
        }
    }

    static async getUserScopes(accessToken) {
        try {
            // Usar escopo armazenado ou determinar baseado nas permissões
            const storedScope = sessionStorage.getItem('user_scope');
            if (storedScope) {
                return storedScope;
            }
            
            // Fallback: alternar entre manager e viewer para demonstração
            return Math.random() > 0.5 ? 'manager' : 'viewer';
        } catch (error) {
            console.log('Erro ao verificar escopos:', error);
            return 'viewer';
        }
    }
}

export default AuthUtils;