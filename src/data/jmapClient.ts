import Client from 'jmap-jam';
import { config } from '../config';

/**
 * JMAP Client management
 * Handles client initialization and provides access to the JMAP client instance
 */
class JmapClient {
    private client: Client | null = null;

    /**
     * Initialize the JMAP client with an access token
     */
    async initialize(accessToken: string): Promise<void> {
        this.client = new Client({
            sessionUrl: config.jmap.sessionEndpoint,
            bearerToken: accessToken,
        });
    }

    /**
     * Get the primary account ID from the session
     */
    async getPrimaryAccountId(): Promise<string> {
        const client = this.getClient();
        return await client.getPrimaryAccount();
    }

    /**
     * Get the current JMAP client instance
     */
    getClient(): Client {
        if (!this.client) {
            throw new Error('JMAP client not initialized. Call initialize() first.');
        }
        return this.client;
    }

    /**
     * Check if the client is initialized
     */
    isInitialized(): boolean {
        return this.client !== null;
    }

    /**
     * Clear the client (on logout)
     */
    clear(): void {
        this.client = null;
    }
}

// Export singleton instance
export const jmapClient = new JmapClient();
