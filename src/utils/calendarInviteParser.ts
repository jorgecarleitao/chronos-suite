/**
 * Parse ICS attachments from emails
 */
import ICAL from 'ical.js';

export interface Attachment {
    blobId: string;
    type: string;
    name?: string;
    size?: number;
}

export interface Invite {
    eventId?: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    organizer?: string;
    location?: string;
}

/**
 * Find ICS attachment in attachments array
 */
export function findICSAttachment(attachments?: Attachment[]): Attachment | null {
    if (!attachments) return null;

    return attachments.find(att =>
        att.type === 'text/calendar' ||
        att.type === 'application/ics'
    ) || null;
}

/**
 * Parse ICS content to extract event details
 */
export function parseICS(icsContent: string): Invite | null {
    try {
        const jcalData = ICAL.parse(icsContent);
        const comp = new ICAL.Component(jcalData);
        const vevent = comp.getFirstSubcomponent('vevent');

        if (!vevent) return null;

        const event = new ICAL.Event(vevent);

        return {
            eventId: event.uid || undefined,
            title: event.summary || 'Event Invitation',
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
            description: event.description || undefined,
            organizer: event.organizer ? event.organizer.replace('mailto:', '') : undefined,
            location: event.location || undefined,
        };
    } catch (error) {
        return null;
    }
}
