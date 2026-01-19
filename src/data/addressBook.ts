import { jmapService } from './jmapClient';
import { withAuthHandling } from '../utils/authHandling';

export interface AddressBook {
    id: string;
    name: string;
    isDefault: boolean;
    shareWith?: Array<{ email: string; mayRead: boolean; mayWrite: boolean }>;
}

/**
 * Fetch all address books for an account
 */
export async function fetchAddressBooks(accountId: string): Promise<AddressBook[]> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const [response] = await client.request([
            'AddressBook/get' as any,
            {
                accountId,
            },
        ]);

        return response.list.map((ab: any) => ({
            id: ab.id,
            name: ab.name,
            isDefault: ab.isDefault || false,
            shareWith: ab.shareWith,
        }));
    });
}

/**
 * Create a new address book
 */
export async function createAddressBook(accountId: string, name: string): Promise<AddressBook> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const [response] = await client.request([
            'AddressBook/set' as any,
            {
                accountId,
                create: {
                    newAddressBook: {
                        name,
                    },
                },
            },
        ]);

        if (response.created?.newAddressBook) {
            return {
                id: response.created.newAddressBook.id,
                name,
                isDefault: false,
            };
        } else {
            throw new Error('Failed to create address book');
        }
    });
}

/**
 * Update an address book
 */
export async function updateAddressBook(
    accountId: string,
    addressBookId: string,
    name: string
): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        await client.request([
            'AddressBook/set' as any,
            {
                accountId,
                update: {
                    [addressBookId]: {
                        name,
                    },
                },
            },
        ]);
    });
}

/**
 * Delete an address book
 */
export async function deleteAddressBook(accountId: string, addressBookId: string): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        await client.request([
            'AddressBook/set' as any,
            {
                accountId,
                destroy: [addressBookId],
            },
        ]);
    });
}
