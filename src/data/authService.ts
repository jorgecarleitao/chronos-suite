import * as oauth from 'oauth4webapi';
import { config } from '../config';

/**
 * OAuth 2.0 with PKCE authentication service
 */

interface AuthState {
  codeVerifier: string;
  state: string;
}

class OAuthService {
  private authServer: oauth.AuthorizationServer | null = null;
  private client: oauth.Client;

  constructor() {
    this.client = {
      client_id: config.oauth.clientId,
      token_endpoint_auth_method: 'none',
    };
  }

  /**
   * Initialize OAuth by discovering authorization server metadata
   */
  async initialize(): Promise<void> {
    if (this.authServer) return;

    const issuer = new URL(config.oauth.authority);
    
    this.authServer = await oauth
      .discoveryRequest(issuer, { algorithm: 'oidc' })
      .then((response) => oauth.processDiscoveryResponse(issuer, response));
  }

  /**
   * Start the OAuth login flow - redirects user to authorization endpoint
   */
  async login(): Promise<void> {
    await this.initialize();

    const codeVerifier = oauth.generateRandomCodeVerifier();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
    const state = oauth.generateRandomState();

    // Store PKCE parameters for callback
    const authState: AuthState = { codeVerifier, state };
    sessionStorage.setItem('oauth_state', JSON.stringify(authState));

    // Build authorization URL
    const authorizationUrl = new URL(this.authServer!.authorization_endpoint!);
    authorizationUrl.searchParams.set('client_id', this.client.client_id);
    authorizationUrl.searchParams.set('redirect_uri', config.oauth.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', config.oauth.scopes.join(' '));
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to authorization endpoint
    window.location.href = authorizationUrl.toString();
  }

  /**
   * Handle OAuth callback after user authorization
   */
  async handleCallback(callbackUrl: string): Promise<void> {
    await this.initialize();

    // Retrieve stored PKCE parameters
    const authStateStr = sessionStorage.getItem('oauth_state');
    if (!authStateStr) {
      throw new Error('No OAuth state found');
    }

    const authState: AuthState = JSON.parse(authStateStr);
    sessionStorage.removeItem('oauth_state');

    // Validate callback parameters
    const currentUrl = new URL(callbackUrl);
    const params = oauth.validateAuthResponse(
      this.authServer!,
      this.client,
      currentUrl,
      authState.state
    );

    // Exchange code for tokens
    const response = await oauth.authorizationCodeGrantRequest(
      this.authServer!,
      this.client,
      oauth.None(), // Public client - no authentication
      params,
      config.oauth.redirectUri,
      authState.codeVerifier
    );

    const result = await oauth.processAuthorizationCodeResponse(
      this.authServer!,
      this.client,
      response
    );

    // Store tokens
    this.storeTokens(result);
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(result: Awaited<ReturnType<typeof oauth.processAuthorizationCodeResponse>>): void {
    sessionStorage.setItem('access_token', result.access_token);
    if (result.refresh_token) {
      sessionStorage.setItem('refresh_token', result.refresh_token);
    }
    if (result.expires_in) {
      const expiresAt = Date.now() + result.expires_in * 1000;
      sessionStorage.setItem('token_expires_at', expiresAt.toString());
    }
  }

  /**
   * Refresh the access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<void> {
    await this.initialize();

    const response = await oauth.refreshTokenGrantRequest(
      this.authServer!,
      this.client,
      oauth.None(),
      refreshToken
    );

    const result = await oauth.processRefreshTokenResponse(
      this.authServer!,
      this.client,
      response
    );

    this.storeTokens(result);
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  /**
   * Get the refresh token
   */
  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token');
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    const expiresAt = sessionStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    return Date.now() >= parseInt(expiresAt, 10);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isTokenExpired();
  }

  /**
   * Logout - clear all tokens
   */
  logout(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token_expires_at');
    sessionStorage.removeItem('oauth_state');
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
