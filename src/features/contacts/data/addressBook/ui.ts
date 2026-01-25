/**
 * UI-friendly AddressBook interface and conversion utilities
 */

import type { AddressBook as JmapAddressBook } from './jmap';

/**
 * UI-friendly address book (client representation)
 */
export interface UIAddressBook {
    id: string;
    name: string;
    isDefault: boolean;
    shareWith?: Array<{ email: string; mayRead: boolean; mayWrite: boolean }>;
}

/**
 * UI-friendly address book form data
 */
export interface UIAddressBookFormData {
    name: string;
}

/**
 * Convert JMAP AddressBook to UI AddressBook
 */
export function fromJmap(jmapAddressBook: JmapAddressBook): UIAddressBook {
    // Convert shareWith from Record to Array
    let shareWith: Array<{ email: string; mayRead: boolean; mayWrite: boolean }> | undefined;
    
    if (jmapAddressBook.shareWith) {
        shareWith = Object.entries(jmapAddressBook.shareWith).map(([email, rights]) => ({
            email,
            mayRead: rights.mayRead,
            mayWrite: rights.mayWrite,
        }));
    }

    return {
        id: jmapAddressBook.id,
        name: jmapAddressBook.name,
        isDefault: jmapAddressBook.isDefault || false,
        shareWith,
    };
}

/**
 * Convert UI form data to JMAP AddressBook
 */
export function toJmap(formData: UIAddressBookFormData, addressBookId?: string): JmapAddressBook {
    const addressBook: JmapAddressBook = {
        id: addressBookId || '',
        name: formData.name,
    };

    return addressBook;
}

/**
 * Convert UI AddressBook to form data
 */
export function toFormData(addressBook: UIAddressBook): UIAddressBookFormData {
    return {
        name: addressBook.name,
    };
}
