import { withAuthHandling, getAuthenticatedClient } from '../utils/authHandling';
import { getDefaultIdentity } from './identityService';
import type { Invite } from '../utils/calendarInviteParser';
import { parseDuration, formatDuration } from '../utils/durationHelpers';

/**
 * Minimal calendar info
 */
export interface CalendarInfo {
    id: string;
    name: string;
    isDefault?: boolean;
}

/**
 * Minimal event info for checking existence
 */
export interface EventInfo {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
}

export async function fetchCalendars(accountId: string): Promise<CalendarInfo[]> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/get' as any,
            {
                accountId,
            },
        ])
    );

    return response.list.map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        isDefault: cal.isDefault || false,
    }));
}

export async function getEvent(
    accountId: string,
    calendarId: string,
    eventId: string,
): Promise<EventInfo | null> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const query = ref.CalendarEvent.query({
                accountId,
                filter: {
                    inCalendar: calendarId,
                    uid: eventId,
                },
            });

            const get = ref.CalendarEvent.get({
                accountId,
                ids: query.$ref('/ids'),
                properties: ['id', 'uid', 'title', 'start', 'duration'],
            });

            return { query, get };
        })
    );

    if (!response.get.list || response.get.list.length === 0) {
        return null;
    }

    const event = response.get.list[0];
    const startDate = new Date(event.start);
    let endDate = startDate;

    if (event.duration) {
        const durationMs = parseDuration(event.duration);
        endDate = new Date(startDate.getTime() + durationMs);
    }

    return {
        id: event.id,
        title: event.title || '(No title)',
        start: startDate,
        end: endDate,
        calendarId,
    };
}

/**
 * Import a calendar invite from an email into the user's calendar
 */
export async function importCalendarInvite(
    accountId: string,
    calendarId: string,
    invite: Invite,
    status: 'accepted' | 'declined' | 'tentative' = 'accepted'
): Promise<EventInfo> {
    if (invite.eventId) {
        const existingEvent = await getEvent(accountId, calendarId, invite.eventId);
        if (existingEvent) {
            throw new Error('This event has already been added to your calendar');
        }
    }

    const client = getAuthenticatedClient();

    // Get user's identity
    const defaultIdentity = await getDefaultIdentity(accountId);

    const durationMs = invite.end.getTime() - invite.start.getTime();
    const duration = formatDuration(durationMs);

    const calendarEvent: any = {
        '@type': 'Event',
        calendarIds: { [calendarId]: true },
        title: invite.title,
        start: invite.start.toISOString(),
        duration: duration,
    };

    // Set UID from the invite to maintain connection with the ICS event
    if (invite.eventId) {
        calendarEvent.uid = invite.eventId;
    }

    if (invite.description) {
        calendarEvent.description = invite.description;
    }

    if (invite.location) {
        calendarEvent.locations = {
            location1: {
                '@type': 'Location',
                name: invite.location,
            },
        };
    }

    // Add attendee participant
    calendarEvent.participants = {
        attendee: {
            '@type': 'Participant',
            email: defaultIdentity.email,
            name: defaultIdentity.name || defaultIdentity.email,
            calendarAddress: `mailto:${defaultIdentity.email}`,
            roles: { attendee: true },
            participationStatus: status,
            expectReply: false,
        },
    };

    // Add organizer if present
    if (invite.organizer) {
        calendarEvent.participants.organizer = {
            '@type': 'Participant',
            email: invite.organizer,
            calendarAddress: `mailto:${invite.organizer}`,
            roles: { owner: true },
            participationStatus: 'accepted',
            expectReply: false,
        };
        calendarEvent.replyTo = {
            imip: `mailto:${invite.organizer}`,
        };
    }

    const [response] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                create: {
                    'new-event': calendarEvent,
                },
                sendSchedulingMessages: true,
            },
        ])
    );

    const createdId = response.created?.['new-event']?.id;
    if (!createdId) {
        throw new Error('Failed to create event');
    }

    return {
        id: createdId,
        title: invite.title,
        start: invite.start,
        end: invite.end,
        calendarId,
    };
}


