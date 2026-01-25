/**
 * AddressBook CRUD operations
 */

import { jmapClient } from '../../../../data/jmapClient';
import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { UIAddressBook, UIAddressBookFormData } from './ui';
import * as AddressBookUI from './ui';

/**
 * Fetch all address books for an account
 */
export async function fetchAddressBooks(accountId: string): Promise<UIAddressBook[]> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'AddressBook/get' as any,
            {
                accountId,
            },
        ])
    );

    return response.list.map((jmapAddressBook: any) => AddressBookUI.fromJmap(jmapAddressBook));
}

/**
 * Create a new address book
 */
export async function createAddressBook(
    accountId: string,
    addressBookData: UIAddressBookFormData
): Promise<UIAddressBook> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'AddressBook/set' as any,
            {
                accountId,
                create: {
                    newAddressBook: {
                        name: addressBookData.name,
                    },
                },
            },
        ])
    );

    if (response.created?.newAddressBook) {
        return {
            id: response.created.newAddressBook.id,
            name: addressBookData.name,
            isDefault: false,
        };
    } else {
        throw new Error('Failed to create address book');
    }
}

/**
 * Update an address book
 */
export async function updateAddressBook(
    accountId: string,
    addressBookId: string,
    updates: UIAddressBookFormData
): Promise<void> {
    const client = getAuthenticatedClient();

    await withAuthHandling(() =>
        client.request([
            'AddressBook/set' as any,
            {
                accountId,
                update: {
                    [addressBookId]: {
                        name: updates.name,
                    },
                },
            },
        ])
    );
}

/**
 * Delete an address book
 */
export async function deleteAddressBook(accountId: string, addressBookId: string): Promise<void> {
    const client = getAuthenticatedClient();

    await withAuthHandling(() =>
        client.request([
            'AddressBook/set' as any,
            {
                accountId,
                destroy: [addressBookId],
            },
        ])
    );
}
