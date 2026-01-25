/**
 * JMAP ContactCard types following JSContact RFC 9553
 * Pure server format from JMAP spec
 */

/**
 * Name component for structured names
 */
export interface NameComponent {
    kind: 'prefix' | 'given' | 'given2' | 'surname' | 'surname2' | 'suffix' | 'credential';
    value: string;
}

/**
 * Structured name
 */
export interface Name {
    '@type'?: 'Name';
    components: NameComponent[];
    isOrdered?: boolean;
    defaultSeparator?: string;
    full?: string;
}

/**
 * Email address
 */
export interface EmailAddress {
    '@type': 'EmailAddress';
    address: string;
    label?: string;
    contexts?: Record<string, boolean>;
    pref?: number;
}

/**
 * Phone number
 */
export interface Phone {
    '@type'?: 'Phone';
    phone: string;
    features?: Record<string, boolean>;
    contexts?: Record<string, boolean>;
    pref?: number;
    label?: string;
}

/**
 * Address
 */
export interface Address {
    '@type'?: 'Address';
    contexts?: Record<string, boolean>;
    pref?: number;
    label?: string;
    fullAddress?: string;
    street?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
}

/**
 * Organization
 */
export interface Organization {
    '@type'?: 'Organization';
    name: string;
    units?: string[];
    sortAs?: string;
    contexts?: Record<string, boolean>;
}

/**
 * Title/Job information
 */
export interface Title {
    '@type'?: 'Title';
    name: string;
    kind?: 'title' | 'role' | 'org-unit';
    organizationId?: string;
}

/**
 * JMAP ContactCard - Pure JMAP spec format
 * Following JSContact RFC 9553
 */
export interface ContactCard {
    '@type'?: 'Card';
    id?: string;
    uid?: string;
    version?: string;
    kind?: 'individual' | 'group' | 'org' | 'location' | 'device' | 'application';
    addressBookIds?: Record<string, boolean>;
    name?: Name;
    fullName?: string;
    emails?: Record<string, EmailAddress>;
    phones?: Record<string, Phone>;
    addresses?: Record<string, Address>;
    organizations?: Record<string, Organization>;
    titles?: Record<string, Title>;
    notes?: string;
    keywords?: Record<string, boolean>;
    created?: string;
    updated?: string;
}
