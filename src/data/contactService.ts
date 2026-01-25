/**
 * Shared contact lookup service
 * Used by multiple features (mail, contacts, etc.)
 */

import { jmapService } from './jmapClient';
import { withAuthHandling } from '../utils/authHandling';

/**
 * Minimal contact info for lookups
 */
export interface ContactInfo {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
}

/**
 * Fetch contacts for lookup purposes (minimal data)
 * This is a shared utility used across features
 */
export async function fetchContactsForLookup(accountId: string): Promise<ContactInfo[]> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        // Query for all contacts
        const [queryResponse] = await client.request([
            'ContactCard/query' as any,
            {
                accountId,
            },
        ]);

        if (!queryResponse.ids || queryResponse.ids.length === 0) {
            return [];
        }

        // Fetch contact details (only fields needed for lookup)
        const [getResponse] = await client.request([
            'ContactCard/get' as any,
            {
                accountId,
                ids: queryResponse.ids,
                properties: ['id', 'name', 'emails', 'organizations', 'titles'],
            },
        ]);

        return getResponse.list.map((contact: any) => {
            // Extract name components
            const nameComponents = contact.name?.components || [];
            const firstName = nameComponents.find((c: any) => c.kind === 'given')?.value || '';
            const lastName = nameComponents.find((c: any) => c.kind === 'surname')?.value || '';

            // Extract email
            let email = '';
            if (contact.emails) {
                const emailKeys = Object.keys(contact.emails);
                if (emailKeys.length > 0) {
                    email = contact.emails[emailKeys[0]]?.address || '';
                }
            }

            // Extract organization and title
            let company: string | undefined;
            let jobTitle: string | undefined;

            if (contact.organizations) {
                const orgKeys = Object.keys(contact.organizations);
                if (orgKeys.length > 0) {
                    company = contact.organizations[orgKeys[0]]?.name;
                }
            }

            if (contact.titles) {
                const titleKeys = Object.keys(contact.titles);
                if (titleKeys.length > 0) {
                    jobTitle = contact.titles[titleKeys[0]]?.name;
                }
            }

            return {
                id: contact.id,
                firstName,
                lastName,
                email,
                company,
                jobTitle,
            };
        });
    });
}

/**
 * Find contact by email address
 */
export async function findContactByEmail(
    accountId: string,
    email: string
): Promise<ContactInfo | null> {
    const contacts = await fetchContactsForLookup(accountId);
    return contacts.find((c) => c.email?.toLowerCase() === email.toLowerCase()) || null;
}
