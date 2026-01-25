/**
 * Calendar Event CRUD operations
 * Handles all server interactions for calendar events
 */

import { jmapService } from '../../../../data/jmapClient';
import { withAuthHandling } from '../../../../utils/authHandling';
import { Invite } from '../../../../utils/calendarInviteParser';
import { UI as RecurrenceUI } from '../recurrenceRule';
import { UI as ParticipantUI } from '../participant';
import { generateOccurrences, calculateEventDuration } from '../../utils/recurrenceHelpers';
import type { UICalendarEvent, UICalendarEventFormData } from './ui';
import * as CalendarEventUI from './ui';
import type { Participant } from '../participant/jmap';

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
 * Fetch calendar events within a date range
 */
export async function fetchCalendarEvents(
    accountId: string,
    calendarId?: string,
    startDate?: Date,
    endDate?: Date
): Promise<UICalendarEvent[]> {
    const client = getAuthenticatedClient();

    // Get user's identity to determine their email
    const [identities] = await withAuthHandling(() =>
        client.request(['Identity/get', { accountId }])
    );
    const userEmail = identities.list[0]?.email;

    // Build filter
    const filter: any = {};
    if (calendarId) {
        filter.inCalendar = calendarId;
    }
    if (startDate || endDate) {
        filter.before = endDate?.toISOString();
        filter.after = startDate?.toISOString();
    }

    // Query for events
    const [queryResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: Object.keys(filter).length > 0 ? filter : undefined,
            },
        ])
    );

    if (!queryResponse.ids || queryResponse.ids.length === 0) {
        return [];
    }

    // Fetch full event details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: queryResponse.ids,
            },
        ])
    );

    return getResponse.list.map((event: any) => CalendarEventUI.fromJmap(event, userEmail));
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
    accountId: string,
    calendarId: string,
    eventData: UICalendarEventFormData
): Promise<UICalendarEvent> {
    const client = getAuthenticatedClient();

    const calendarEvent = CalendarEventUI.toJmap(eventData, calendarId);

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

    // Fetch the created event to verify what was actually stored
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [createdId],
            },
        ])
    );

    const createdEvent = getResponse.list[0];
    return CalendarEventUI.fromJmap(createdEvent);
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
    accountId: string,
    calendarId: string,
    eventId: string,
    updates: UICalendarEventFormData
): Promise<void> {
    const client = getAuthenticatedClient();

    const patch = CalendarEventUI.toJmap(updates, calendarId, eventId);

    await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: patch,
                },
                sendSchedulingMessages: true,
            },
        ])
    );
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(accountId: string, eventId: string): Promise<void> {
    const client = getAuthenticatedClient();

    await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                destroy: [eventId],
                sendSchedulingMessages: true,
            },
        ])
    );
}

/**
 * Fetch calendars for the account
 */
export async function fetchCalendars(
    accountId: string
): Promise<Array<{ id: string; name: string }>> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/get' as any,
            {
                accountId,
            },
        ])
    );

    return response.list.map((calendar: any) => ({
        id: calendar.id,
        name: calendar.name || 'Unnamed Calendar',
    }));
}

/**
 * Respond to a calendar invitation (accept/decline/tentative)
 */
export async function respondToCalendarInvite(
    accountId: string,
    eventId: string,
    status: 'accepted' | 'declined' | 'tentative'
): Promise<void> {
    const client = getAuthenticatedClient();

    // Get user's identity to find their participant entry
    const [identities] = await withAuthHandling(() =>
        client.request(['Identity/get', { accountId }])
    );
    const defaultIdentity = identities.list[0];
    const userEmail = defaultIdentity.email;

    // Get the event to find the user's participant ID
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [eventId],
            },
        ])
    );

    if (!getResponse.list || getResponse.list.length === 0) {
        throw new Error('Event not found');
    }

    const event = getResponse.list[0];

    // Find the participant entry for the current user
    let userParticipantId: string | null = null;
    if (event.participants) {
        for (const [participantId, participant] of Object.entries(
            event.participants as Record<string, any>
        )) {
            if (participant.email === userEmail) {
                userParticipantId = participantId;
                break;
            }
        }
    }

    if (!userParticipantId) {
        throw new Error('You are not a participant in this event');
    }

    // Update the participant's status
    const patch: any = {
        [`participants/${userParticipantId}/participationStatus`]: status,
    };

    await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: patch,
                },
                sendSchedulingMessages: true, // Automatically send iTIP reply to organizer
            },
        ])
    );
}

/**
 * Check if an event already exists in the calendar by UID
 */
export async function checkEventExists(
    accountId: string,
    calendarId: string,
    invite: Invite
): Promise<UICalendarEvent | null> {
    // If no UID, cannot check for duplicates
    if (!invite.eventId) {
        return null;
    }

    const client = getAuthenticatedClient();

    // Query for events with matching UID
    const [queryResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: {
                    inCalendar: calendarId,
                    uid: invite.eventId,
                },
            },
        ])
    );

    if (!queryResponse.ids || queryResponse.ids.length === 0) {
        return null;
    }

    // Event with same UID exists - fetch details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [queryResponse.ids[0]],
            },
        ])
    );

    if (!getResponse.list || getResponse.list.length === 0) {
        return null;
    }

    const event = getResponse.list[0];
    return CalendarEventUI.fromJmap(event);
}

/**
 * Import a calendar invite from an email into the user's calendar
 */
export async function importCalendarInvite(
    accountId: string,
    calendarId: string,
    invite: Invite,
    status: 'accepted' | 'declined' | 'tentative' = 'accepted'
): Promise<UICalendarEvent> {
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

    // Convert invite to form data format
    const formData: UICalendarEventFormData = {
        title: invite.title,
        start: invite.start,
        end: invite.end,
        description: invite.description,
        location: invite.location,
        participants: [],
    };

    // Convert to JMAP and add extra fields
    const jmapEvent = CalendarEventUI.toJmap(formData, calendarId, invite.eventId);

    // Add attendee participant
    const attendeeParticipant: Participant = {
        '@type': 'Participant',
        email: defaultIdentity.email,
        name: defaultIdentity.name || defaultIdentity.email,
        calendarAddress: `mailto:${defaultIdentity.email}`,
        roles: { attendee: true },
        participationStatus: status,
        expectReply: false,
    };

    jmapEvent.participants = {
        attendee: ParticipantUI.createJmapParticipant(attendeeParticipant),
    };

    // Add organizer if present
    if (invite.organizer) {
        jmapEvent.participants.organizer = {
            '@type': 'Participant',
            email: invite.organizer,
            calendarAddress: `mailto:${invite.organizer}`,
            roles: { owner: true },
            participationStatus: 'accepted',
            expectReply: false,
        };
        (jmapEvent as any).replyTo = {
            imip: `mailto:${invite.organizer}`,
        };
    }

    const [response] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                create: {
                    'new-event': jmapEvent,
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
        description: invite.description,
        userParticipationStatus: status,
    };
}

/**
 * Expand recurring events to individual occurrences within a date range
 * For each recurring event, generates instances for the given date range
 */
export function expandRecurringEvents(
    events: UICalendarEvent[],
    startDate: Date,
    endDate: Date
): UICalendarEvent[] {
    const expandedEvents: UICalendarEvent[] = [];

    for (const event of events) {
        if (event.recurrenceRules?.length) {
            // Calculate event duration
            const duration = calculateEventDuration(event.start, event.end);

            // Generate occurrences from JMAP RecurrenceRule
            const occurrences = generateOccurrences(
                event.recurrenceRules,
                event.start,
                endDate,
                duration
            );

            // Filter occurrences to be within range and create event instances
            for (const occurrence of occurrences) {
                if (occurrence.start >= startDate && occurrence.start <= endDate) {
                    expandedEvents.push({
                        ...event,
                        id: `${event.id}#${occurrence.start.toISOString()}`, // Unique ID for each occurrence
                        start: occurrence.start,
                        end: occurrence.end,
                        isRecurringEventInstance: true, // Mark as instance of recurring event
                    });
                }
            }
        } else {
            // Non-recurring event - add as is
            expandedEvents.push(event);
        }
    }

    return expandedEvents;
}
