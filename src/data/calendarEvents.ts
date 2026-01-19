import { jmapService } from './jmapClient';
import { Invite } from '../utils/calendarInviteParser';
import { withAuthHandling } from '../utils/authHandling';
import { parseJmapParticipants, createJmapParticipant, createJmapOrganizer } from '../utils/participantUtils';
import type { Participant, CalendarEvent } from '../types/calendar';

export type { Participant, CalendarEvent } from '../types/calendar';

/**
 * Fetch calendar events within a date range
 */
export async function fetchCalendarEvents(
    accountId: string,
    calendarId?: string,
    startDate?: Date,
    endDate?: Date
): Promise<CalendarEvent[]> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        // Get user's identity to determine their email
        const [identities] = await client.request(['Identity/get', { accountId }]);
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
        const [queryResponse] = await client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: Object.keys(filter).length > 0 ? filter : undefined,
            },
        ]);

        if (!queryResponse.ids || queryResponse.ids.length === 0) {
            return [];
        }

        // Fetch full event details
        const [getResponse] = await client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: queryResponse.ids,
            },
        ]);

        const events = getResponse.list.map((event: any) => {
            const startDate = new Date(event.start);
            let endDate = startDate;

            // Parse duration to calculate end date
            if (event.duration) {
                const durationMs = parseDuration(event.duration);
                endDate = new Date(startDate.getTime() + durationMs);
            }

            // Parse participants
            const { participants, userParticipationStatus } = parseJmapParticipants(
                event.participants,
                userEmail
            );

            // Parse location from locations object
            let location: string | undefined;
            if (event.locations) {
                const firstLocation = Object.values(event.locations)[0] as any;
                if (firstLocation && firstLocation.name) {
                    location = firstLocation.name;
                }
            }

            return {
                id: event.id,
                title: event.title || '(No title)',
                start: startDate,
                end: endDate,
                calendarId: Object.keys(event.calendarIds || {})[0],
                description: event.description,
                location,
                participants: participants.length > 0 ? participants : undefined,
                userParticipationStatus,
            };
        });

        return events;
    });
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

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
    accountId: string,
    calendarId: string,
    event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        // Calculate duration from start to end
        const endDate = event.end || new Date(event.start!.getTime() + 3600000); // Default 1 hour
        const duration = calculateDuration(event.start!, endDate);

        const calendarEvent: any = {
            '@type': 'Event',
            calendarIds: { [calendarId]: true },
            title: event.title || '',
            start: event.start?.toISOString(),
            duration: duration,
        };

        if (event.description) {
            calendarEvent.description = event.description;
        }

        // Add location if provided
        if (event.location) {
            calendarEvent.locations = {
                location1: {
                    '@type': 'Location',
                    name: event.location,
                },
            };
        }

        // Add participants if provided
        if (event.participants && event.participants.length > 0) {
            // Get user's identity for replyTo (only when participants are present)
            const [identities] = await client.request(['Identity/get', { accountId }]);
            const defaultIdentity = identities.list[0];

            // Add replyTo - required when participants are present
            calendarEvent.replyTo = {
                imip: `mailto:${defaultIdentity.email}`,
            };

            // Add the organizer as a participant with owner role
            calendarEvent.participants = {
                organizer: createJmapOrganizer(
                    defaultIdentity.email,
                    defaultIdentity.name || defaultIdentity.email
                ),
            };

            // Add other participants as attendees
            event.participants.forEach((participant, index) => {
                const participantId = `attendee-${index}`;
                calendarEvent.participants[participantId] = createJmapParticipant(
                    participant
                );
            });
        }

        const [response] = await client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                create: {
                    'new-event': calendarEvent,
                },
            },
        ]);

        const createdId = response.created?.['new-event']?.id;
        if (!createdId) {
            throw new Error('Failed to create event');
        }

        // Fetch the created event to verify what was actually stored
        const [getResponse] = await client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [createdId],
            },
        ]);

        const createdEvent = getResponse.list[0];

        // Parse participants from the retrieved event
        const { participants: retrievedParticipants } = parseJmapParticipants(
            createdEvent?.participants
        );

        return {
            id: createdId,
            title: createdEvent?.title || event.title || '',
            start: event.start!,
            end: endDate,
            calendarId,
            description: createdEvent?.description || event.description,
            participants: retrievedParticipants.length > 0 ? retrievedParticipants : undefined,
        };
    });
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
    accountId: string,
    eventId: string,
    updates: Partial<CalendarEvent>
): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const patch: any = {};

        if (updates.title !== undefined) {
            patch.title = updates.title;
        }

        if (updates.start !== undefined) {
            patch.start = updates.start.toISOString();

            // If start is updated and we have end, recalculate duration
            if (updates.end !== undefined) {
                patch.duration = calculateDuration(updates.start, updates.end);
            }
        } else if (updates.end !== undefined && updates.start) {
            // If only end is updated, recalculate duration with existing start
            patch.duration = calculateDuration(updates.start, updates.end);
        }

        if (updates.description !== undefined) {
            patch.description = updates.description;
        }

        // Update participants if provided
        if (updates.participants !== undefined) {
            // Get user's identity (only when participants are being updated)
            const [identities] = await client.request(['Identity/get', { accountId }]);
            const defaultIdentity = identities.list[0];

            // Add replyTo - required when participants are present
            patch.replyTo = {
                imip: `mailto:${defaultIdentity.email}`,
            };

            // Add the organizer as a participant with owner role
            patch.participants = {
                organizer: createJmapOrganizer(
                    defaultIdentity.email,
                    defaultIdentity.name || defaultIdentity.email
                ),
            };

            // Add other participants
            updates.participants.forEach((participant, index) => {
                const participantId = `attendee-${index}`;
                patch.participants[participantId] = createJmapParticipant(
                    participant
                );
            });
        }

        await client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: patch,
                },
            },
        ]);
    });
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(accountId: string, eventId: string): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        await client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                destroy: [eventId],
            },
        ]);
    });
}

/**
 * Fetch calendars for the account
 */
export async function fetchCalendars(
    accountId: string
): Promise<Array<{ id: string; name: string }>> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        const [response] = await client.request([
            'Calendar/get' as any,
            {
                accountId,
            },
        ]);

        return response.list.map((calendar: any) => ({
            id: calendar.id,
            name: calendar.name || 'Unnamed Calendar',
        }));
    });
}

/**
 * Respond to a calendar invitation (accept/decline/tentative)
 */
export async function respondToCalendarInvite(
    accountId: string,
    eventId: string,
    status: 'accepted' | 'declined' | 'tentative'
): Promise<void> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const client = jmapService.getClient();

        // Get user's identity to find their participant entry
        const [identities] = await client.request(['Identity/get', { accountId }]);
        const defaultIdentity = identities.list[0];
        const userEmail = defaultIdentity.email;

        // Get the event to find the user's participant ID
        const [getResponse] = await client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [eventId],
            },
        ]);

        if (!getResponse.list || getResponse.list.length === 0) {
            throw new Error('Event not found');
        }

        const event = getResponse.list[0];

        // Find the participant entry for the current user
        let userParticipantId: string | null = null;
        if (event.participants) {
            for (const [participantId, participant] of Object.entries(event.participants as Record<string, any>)) {
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

        await client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: patch,
                },
                sendSchedulingMessages: true, // Automatically send iTIP reply to organizer
            },
        ]);
    });
}

/**
 * Check if an event already exists in the calendar by UID
 */
export async function checkEventExists(
    accountId: string,
    calendarId: string,
    invite: Invite
): Promise<CalendarEvent | null> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        // If no UID, cannot check for duplicates
        if (!invite.eventId) {
            return null;
        }

        const client = jmapService.getClient();

        // Query for events with matching UID
        const [queryResponse] = await client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: {
                    inCalendar: calendarId,
                    uid: invite.eventId,
                },
            },
        ]);

        if (!queryResponse.ids || queryResponse.ids.length === 0) {
            return null;
        }

        // Event with same UID exists - fetch details
        const [getResponse] = await client.request([
            'CalendarEvent/get' as any,
            {
                accountId,
                ids: [queryResponse.ids[0]],
            },
        ]);

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
    });
}

/**
 * Import a calendar invite from an email into the user's calendar
 */
export async function importCalendarInvite(
    accountId: string,
    calendarId: string,
    invite: Invite,
    status: 'accepted' | 'declined' | 'tentative' = 'accepted'
): Promise<CalendarEvent> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        // Check if event already exists in calendar
        const existingEvent = await checkEventExists(accountId, calendarId, invite);
        if (existingEvent) {
            throw new Error('This event has already been added to your calendar');
        }

        const client = jmapService.getClient();
        const duration = calculateDuration(invite.start, invite.end);

        // Get user's identity
        const [identities] = await client.request(['Identity/get', { accountId }]);
        const defaultIdentity = identities.list[0];

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

        // Add participants
        const attendeeParticipant: Participant = {
            email: defaultIdentity.email,
            name: defaultIdentity.name || defaultIdentity.email,
            role: 'attendee',
            rsvp: false,
            scheduleStatus: status,
        };

        calendarEvent.participants = {
            attendee: createJmapParticipant(attendeeParticipant),
        };

        if (invite.organizer) {
            calendarEvent.participants.organizer = createJmapOrganizer(invite.organizer);
        }

        const [response] = await client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                create: {
                    'new-event': calendarEvent,
                },
                sendSchedulingMessages: true, // Automatically send iTIP reply to organizer
            },
        ]);

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
    });
}
