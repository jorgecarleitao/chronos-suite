/**
 * UI-friendly Contact interface and conversion utilities
 */

import type { ContactCard, NameComponent, EmailAddress, Phone, Address, Organization, Title } from './jmap';

/**
 * UI-friendly contact (client representation)
 */
export interface UIContact {
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
 * UI-friendly contact form data
 */
export interface UIContactFormData {
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
 * Convert JMAP ContactCard to UI Contact
 */
export function fromJmap(jmapContact: ContactCard): UIContact {
    // Extract name components
    const nameComponents = jmapContact.name?.components || [];
    const firstName = nameComponents.find((c) => c.kind === 'given')?.value || '';
    const lastName = nameComponents.find((c) => c.kind === 'surname')?.value || '';

    // Extract email - get first email from the emails map
    let email = '';
    if (jmapContact.emails) {
        const emailKeys = Object.keys(jmapContact.emails);
        if (emailKeys.length > 0) {
            email = jmapContact.emails[emailKeys[0]]?.address || '';
        }
    }

    // Extract organization and title
    let company: string | undefined;
    let jobTitle: string | undefined;
    
    if (jmapContact.organizations) {
        const orgKeys = Object.keys(jmapContact.organizations);
        if (orgKeys.length > 0) {
            company = jmapContact.organizations[orgKeys[0]]?.name;
        }
    }
    
    if (jmapContact.titles) {
        const titleKeys = Object.keys(jmapContact.titles);
        if (titleKeys.length > 0) {
            jobTitle = jmapContact.titles[titleKeys[0]]?.name;
        }
    }

    // Extract phones
    const phones = jmapContact.phones
        ? Object.values(jmapContact.phones).map((p) => ({
              type: p.label || 'other',
              value: p.phone,
          }))
        : undefined;

    // Extract addresses
    const addresses = jmapContact.addresses
        ? Object.values(jmapContact.addresses).map((a) => ({
              type: a.label || 'other',
              street: a.street,
              city: a.locality,
              postalCode: a.postcode,
              country: a.country,
          }))
        : undefined;

    return {
        id: jmapContact.id || '',
        firstName,
        lastName,
        email,
        company,
        jobTitle,
        phones,
        addresses,
        notes: jmapContact.notes,
        isFavorite: jmapContact.keywords?.starred || false,
    };
}

/**
 * Convert UI form data to JMAP ContactCard
 */
export function toJmap(
    formData: UIContactFormData,
    addressBookId: string,
    contactId?: string
): ContactCard {
    const contactCard: ContactCard = {
        '@type': 'Card',
        addressBookIds: { [addressBookId]: true },
    };

    if (contactId) {
        contactCard.id = contactId;
    }

    // Add name
    if (formData.firstName || formData.lastName) {
        contactCard.name = {
            components: [
                { kind: 'given', value: formData.firstName || '' },
                { kind: 'surname', value: formData.lastName || '' },
            ],
        };
    }

    // Add email
    if (formData.email) {
        contactCard.emails = {
            'email-1': {
                '@type': 'EmailAddress',
                address: formData.email,
            },
        };
    }

    // Add organization
    if (formData.company) {
        contactCard.organizations = {
            'org-1': {
                '@type': 'Organization',
                name: formData.company,
            },
        };
    }

    // Add job title
    if (formData.jobTitle) {
        contactCard.titles = {
            'title-1': {
                '@type': 'Title',
                name: formData.jobTitle,
            },
        };
    }

    // Add phones
    if (formData.phones && formData.phones.length > 0) {
        contactCard.phones = Object.fromEntries(
            formData.phones.map((p, index) => [
                `phone-${index + 1}`,
                {
                    '@type': 'Phone',
                    phone: p.value,
                    label: p.type,
                },
            ])
        );
    }

    // Add addresses
    if (formData.addresses && formData.addresses.length > 0) {
        contactCard.addresses = Object.fromEntries(
            formData.addresses.map((a, index) => [
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

    // Add notes
    if (formData.notes) {
        contactCard.notes = formData.notes;
    }

    // Add favorite status
    if (formData.isFavorite) {
        contactCard.keywords = { starred: true };
    }

    return contactCard;
}

/**
 * Convert UI Contact to form data
 */
export function toFormData(contact: UIContact): UIContactFormData {
    return {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        company: contact.company,
        jobTitle: contact.jobTitle,
        phones: contact.phones,
        addresses: contact.addresses,
        notes: contact.notes,
        isFavorite: contact.isFavorite,
    };
}
