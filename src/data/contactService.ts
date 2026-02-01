import { withAuthHandling, getAuthenticatedClient } from '../utils/authHandling';

export interface ContactInfo {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
}

function mapContactCardToContactInfo(contact: any): ContactInfo {
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
}

export async function fetchContacts(accountId: string, emails?: string[]): Promise<ContactInfo[]> {
    // Build filter if emails are provided
    const filter =
        emails && emails.length > 0
            ? {
                  operator: 'or',
                  conditions: emails.map((email) => ({ emailAddress: email })),
              }
            : undefined;

    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();
        const [response] = await client.requestMany((ref) => {
            const query = ref.ContactCard.query({
                accountId,
                ...(filter && { filter }),
            });

            const get = ref.ContactCard.get({
                accountId,
                ids: query.$ref('/ids'),
                properties: ['id', 'name', 'emails', 'organizations', 'titles'],
            });

            return { query, get };
        });

        if (!response.get.list || response.get.list.length === 0) {
            return [];
        }

        return response.get.list.map(mapContactCardToContactInfo);
    });
}
