/**
 * Contact CRUD operations
 */

import { jmapClient } from '../../../../data/jmapClient';
import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { UIContact, UIContactFormData } from './ui';
import * as ContactUI from './ui';

/**
 * Fetch contacts from an address book
 */
export async function fetchContacts(
    accountId: string,
    addressBookId?: string
): Promise<UIContact[]> {
    const client = getAuthenticatedClient();

    // Query for contacts
    const filter: any = {};
    if (addressBookId) {
        filter.inAddressBook = addressBookId;
    }

    const [queryResponse] = await withAuthHandling(() =>
        client.request([
            'ContactCard/query' as any,
            {
                accountId,
                filter,
            },
        ])
    );

    if (!queryResponse.ids || queryResponse.ids.length === 0) {
        return [];
    }

    // Fetch full contact details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'ContactCard/get' as any,
            {
                accountId,
                ids: queryResponse.ids,
            },
        ])
    );

    const contacts = getResponse.list.map((jmapContact: any) => ContactUI.fromJmap(jmapContact));

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
}

/**
 * Create a new contact
 */
export async function createContact(
    accountId: string,
    addressBookId: string,
    contactData: UIContactFormData
): Promise<UIContact> {
    const client = getAuthenticatedClient();

    const jmapContact = ContactUI.toJmap(contactData, addressBookId);

    const [response] = await withAuthHandling(() =>
        client.request([
            'ContactCard/set' as any,
            {
                accountId,
                create: {
                    newContact: jmapContact,
                },
            },
        ])
    );

    if (response.created?.newContact) {
        return { ...contactData, id: response.created.newContact.id } as UIContact;
    } else {
        throw new Error('Failed to create contact');
    }
}

/**
 * Update an existing contact
 */
export async function updateContact(
    accountId: string,
    contactId: string,
    updates: UIContactFormData
): Promise<void> {
    const client = getAuthenticatedClient();

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

    if (updates.company !== undefined) {
        patches['organizations/org-1'] = {
            '@type': 'Organization',
            name: updates.company,
        };
    }

    if (updates.jobTitle !== undefined) {
        patches['titles/title-1'] = {
            '@type': 'Title',
            name: updates.jobTitle,
        };
    }

    if (updates.phones !== undefined) {
        patches.phones = Object.fromEntries(
            updates.phones.map((p, index) => [
                `phone-${index + 1}`,
                { '@type': 'Phone', phone: p.value, label: p.type },
            ])
        );
    }

    if (updates.addresses !== undefined) {
        patches.addresses = Object.fromEntries(
            updates.addresses.map((a, index) => [
                `address-${index + 1}`,
                {
                    '@type': 'Address',
                    label: a.type,
                    street: a.street,
                    locality: a.city,
                    postcode: a.postalCode,
                    country: a.country,
                },
            ])
        );
    }

    if (updates.notes !== undefined) {
        patches.notes = updates.notes;
    }

    if (updates.isFavorite !== undefined) {
        patches['keywords/starred'] = updates.isFavorite;
    }

    await withAuthHandling(() =>
        client.request([
            'ContactCard/set' as any,
            {
                accountId,
                update: {
                    [contactId]: patches,
                },
            },
        ])
    );
}

/**
 * Delete a contact
 */
export async function deleteContact(accountId: string, contactId: string): Promise<void> {
    const client = getAuthenticatedClient();

    await withAuthHandling(() =>
        client.request([
            'ContactCard/set' as any,
            {
                accountId,
                destroy: [contactId],
            },
        ])
    );
}
