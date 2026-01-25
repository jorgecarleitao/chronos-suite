/**
 * Shared calendar service
 * Used by multiple features (mail for calendar invites, calendar feature itself)
 */

import { jmapService } from './jmapClient';
import { withAuthHandling } from '../utils/authHandling';
import type { Invite } from '../utils/calendarInviteParser';

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

/**
 * Get authenticated JMAP client
 */
function getAuthenticatedClient() {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }
    return jmapService.getClient();
}

/**
 * Fetch calendars for an account
 */
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

/**
 * Check if an event already exists in the calendar by UID
 */
export async function checkEventExists(
    accountId: string,
    calendarId: string,
    invite: Invite
): Promise<EventInfo | null> {
    const client = getAuthenticatedClient();

    // Query for events with the same UID
    const [queryResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: {
                    inCalendars: [calendarId],
                    uid: invite.eventId,
                },
            },
        ])
    );

    if (!queryResponse.ids || queryResponse.ids.length === 0) {
        return null;
    }

    // Fetch the event details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: queryResponse.ids.slice(0, 1),
            },
        ])
    );

    if (!getResponse.list || getResponse.list.length === 0) {
        return null;
    }

    const event = getResponse.list[0];
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
    // Check if event already exists in calendar
    const existingEvent = await checkEventExists(accountId, calendarId, invite);
    if (existingEvent) {
        throw new Error('This event has already been added to your calendar');
    }

    const client = getAuthenticatedClient();

    // Get user's identity
    const [identities] = await withAuthHandling(() =>
        client.request(['Identity/get', { accountId }])
    );
    const defaultIdentity = identities.list[0];

    const duration = calculateDuration(invite.start, invite.end);

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

/**
 * Parse ISO 8601 duration to milliseconds
 */
function parseDuration(duration: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);

    if (!matches) {
        return 3600000; // Default 1 hour
    }

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Calculate ISO 8601 duration between two dates
 */
function calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
        return `PT${diffMinutes}M`;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (minutes === 0) {
        return `PT${hours}H`;
    }

    return `PT${hours}H${minutes}M`;
}
