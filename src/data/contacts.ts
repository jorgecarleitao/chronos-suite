import { jmapService } from './jmapClient';
import { oauthService } from './authService';

/**
 * Handle authentication errors
 */
async function handleAuthError(error: any): Promise<never> {
    if (
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized') ||
        error.message?.includes('authentication')
    ) {
        const refreshToken = oauthService.getRefreshToken();
        if (refreshToken) {
            try {
                await oauthService.refreshAccessToken(refreshToken);
                const newAccessToken = oauthService.getAccessToken();
                if (newAccessToken) {
                    await jmapService.initialize(newAccessToken);
                    throw new Error('TOKEN_REFRESHED');
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
            }
        }

        oauthService.logout();
        jmapService.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    throw error;
}

async function withAuthHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        await handleAuthError(error);
        if (error instanceof Error && error.message === 'TOKEN_REFRESHED') {
            return await fn();
        }
        throw error;
    }
}

export interface Contact {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    phones?: Array<{ type: string; value: string }>;
    addresses?: Array<{
        type: string;
        street?: string;
        city?: string;
        postalCode?: string;
        country?: string;
    }>;
    notes?: string;
    isFavorite?: boolean;
}

/**
 * Fetch contacts from an address book
 */
export async function fetchContacts(accountId: string, addressBookId?: string): Promise<Contact[]> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        // Query for contacts
        const filter: any = {};
        if (addressBookId) {
            filter.inAddressBook = addressBookId;
        }

        const [queryResponse] = await client.request([
            'ContactCard/query' as any,
            {
                accountId,
                filter,
            },
        ]);

        if (!queryResponse.ids || queryResponse.ids.length === 0) {
            return [];
        }

        // Fetch full contact details
        const [getResponse] = await client.request([
            'ContactCard/get' as any,
            {
                accountId,
                ids: queryResponse.ids,
            },
        ]);

        const contacts = getResponse.list.map((contact: any) => {
            // Extract name components
            const nameComponents = contact.name?.components || [];
            const firstName = nameComponents.find((c: any) => c.kind === 'given')?.value || '';
            const lastName = nameComponents.find((c: any) => c.kind === 'surname')?.value || '';

            // Extract email - try different possible structures
            let email = '';
            if (contact.emails) {
                // emails can be an object (map) or array
                if (Array.isArray(contact.emails)) {
                    email = contact.emails[0]?.email || contact.emails[0]?.address || '';
                } else {
                    // emails is an object/map
                    const emailKeys = Object.keys(contact.emails);
                    if (emailKeys.length > 0) {
                        email = contact.emails[emailKeys[0]]?.address || '';
                    }
                }
            }

            return {
                id: contact.id,
                firstName,
                lastName,
                email,
                company: contact.organizations?.[0]?.name,
                jobTitle: contact.organizations?.[0]?.jobTitle,
                phones: contact.phones?.map((p: any) => ({
                    type: p.type || 'other',
                    value: p.phone,
                })),
                addresses: contact.addresses?.map((a: any) => ({
                    type: a.type || 'other',
                    street: a.street,
                    city: a.locality,
                    postalCode: a.postcode,
                    country: a.country,
                })),
                notes: contact.notes,
                isFavorite: contact.keywords?.starred || false,
            };
        });

        // Sort client-side by lastName, then firstName
        contacts.sort((a, b) => {
            const lastNameA = (a.lastName || '').toLowerCase();
            const lastNameB = (b.lastName || '').toLowerCase();
            if (lastNameA !== lastNameB) {
                return lastNameA.localeCompare(lastNameB);
            }
            const firstNameA = (a.firstName || '').toLowerCase();
            const firstNameB = (b.firstName || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
        });

        return contacts;
    });
}

/**
 * Create a new contact
 */
export async function createContact(
    accountId: string,
    addressBookId: string,
    contact: Partial<Contact>
): Promise<Contact> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const contactCard: any = {
            addressBookIds: { [addressBookId]: true },
        };

        if (contact.firstName || contact.lastName) {
            contactCard.name = {
                components: [
                    { kind: 'given', value: contact.firstName || '' },
                    { kind: 'surname', value: contact.lastName || '' },
                ],
            };
        }

        if (contact.email) {
            contactCard.emails = {
                'email-1': {
                    '@type': 'EmailAddress',
                    address: contact.email,
                },
            };
        }

        if (contact.company || contact.jobTitle) {
            contactCard.organizations = [
                {
                    name: contact.company,
                    jobTitle: contact.jobTitle,
                },
            ];
        }

        if (contact.phones) {
            contactCard.phones = contact.phones.map((p) => ({ phone: p.value, type: p.type }));
        }

        if (contact.addresses) {
            contactCard.addresses = contact.addresses.map((a) => ({
                type: a.type,
                street: a.street,
                locality: a.city,
                postcode: a.postalCode,
                country: a.country,
            }));
        }

        if (contact.notes) {
            contactCard.notes = contact.notes;
        }

        if (contact.isFavorite) {
            contactCard.keywords = { starred: true };
        }

        const [response] = await client.request([
            'ContactCard/set' as any,
            {
                accountId,
                create: {
                    newContact: contactCard,
                },
            },
        ]);

        if (response.created?.newContact) {
            return { ...contact, id: response.created.newContact.id } as Contact;
        } else {
            throw new Error('Failed to create contact');
        }
    });
}

/**
 * Update an existing contact
 */
export async function updateContact(
    accountId: string,
    contactId: string,
    updates: Partial<Contact>
): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const patches: any = {};

        if (updates.firstName !== undefined || updates.lastName !== undefined) {
            patches['name/components'] = [
                { kind: 'given', value: updates.firstName || '' },
                { kind: 'surname', value: updates.lastName || '' },
            ];
        }

        if (updates.email !== undefined) {
            patches['emails/email-1'] = {
                '@type': 'EmailAddress',
                address: updates.email,
            };
        }

        if (updates.company !== undefined || updates.jobTitle !== undefined) {
            patches.organizations = [
                {
                    name: updates.company,
                    jobTitle: updates.jobTitle,
                },
            ];
        }

        if (updates.phones !== undefined) {
            patches.phones = updates.phones.map((p) => ({ phone: p.value, type: p.type }));
        }

        if (updates.addresses !== undefined) {
            patches.addresses = updates.addresses.map((a) => ({
                type: a.type,
                street: a.street,
                locality: a.city,
                postcode: a.postalCode,
                country: a.country,
            }));
        }

        if (updates.notes !== undefined) {
            patches.notes = updates.notes;
        }

        if (updates.isFavorite !== undefined) {
            patches['keywords/starred'] = updates.isFavorite;
        }

        await client.request([
            'ContactCard/set' as any,
            {
                accountId,
                update: {
                    [contactId]: patches,
                },
            },
        ]);
    });
}

/**
 * Delete a contact
 */
export async function deleteContact(accountId: string, contactId: string): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        await client.request([
            'ContactCard/set' as any,
            {
                accountId,
                destroy: [contactId],
            },
        ]);
    });
}
