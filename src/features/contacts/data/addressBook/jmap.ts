/**
 * JMAP AddressBook types
 * Pure server format from JMAP spec
 */

/**
 * Share rights for an address book
 */
export interface ShareRights {
    mayRead: boolean;
    mayWrite: boolean;
    mayAdmin?: boolean;
}

/**
 * JMAP AddressBook - Pure JMAP spec format
 */
export interface AddressBook {
    id: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    isSubscribed?: boolean;
    shareWith?: Record<string, ShareRights>;
    myRights?: ShareRights;
}
