import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import { getDefaultIdentity } from '../../../../data/identityService';
import { generateOccurrencesFromRule } from '../../utils/recurrenceHelpers';
import { parseDuration, formatDuration } from '../../../../utils/durationHelpers';
import { formatDateTime } from '../../../../utils/dateHelpers';
import type { UICalendarEvent, UICalendarEventFormData } from './ui';
import * as CalendarEventUI from './ui';

export async function fetchCalendarEvents(
    accountId: string,
    calendarId?: string,
    startDate?: Date,
    endDate?: Date
): Promise<UICalendarEvent[]> {
    const client = getAuthenticatedClient();

    // Get user's identity to determine their email
    const defaultIdentity = await getDefaultIdentity(accountId);
    const organizerEmail = defaultIdentity.email;

    // Build filter
    const filter: any = {};
    if (calendarId) {
        filter.inCalendar = calendarId;
    }
    if (endDate) {
        filter.before = endDate.toISOString().split('.')[0];
    }
    if (startDate) {
        filter.after = startDate.toISOString().split('.')[0];
    }

    // Query and fetch events in a single batch request
    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const query = ref.CalendarEvent.query({
                accountId,
                timeZone: 'UTC',
                filter: Object.keys(filter).length > 0 ? filter : undefined,
            });

            const get = ref.CalendarEvent.get({
                accountId,
                ids: query.$ref('/ids'),
            });

            return { query, get };
        })
    );

    return response.get.list.map((event: any) => CalendarEventUI.fromJmap(event, organizerEmail));
}

export async function createCalendarEvent(
    accountId: string,
    calendarId: string,
    eventData: UICalendarEventFormData
): Promise<UICalendarEvent> {
    const client = getAuthenticatedClient();

    const calendarEvent = CalendarEventUI.toJmap(eventData, calendarId);

    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const set = ref.CalendarEvent.set({
                accountId,
                create: {
                    'new-event': calendarEvent,
                },
                sendSchedulingMessages: true,
            });

            const get = ref.CalendarEvent.get({
                accountId,
                ids: set.$ref('/created/new-event/id'),
            });

            return { set, get };
        })
    );

    const createdId = response.set.created?.['new-event']?.id;
    if (!createdId) {
        throw new Error('Failed to create event');
    }

    return CalendarEventUI.fromJmap(response.get.list[0]);
}

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

export async function deleteSingleOccurrence(
    accountId: string,
    eventId: string,
    recurrenceId: string
): Promise<void> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const get = ref.CalendarEvent.get({
                accountId,
                ids: [eventId],
            });

            return { get };
        })
    );

    if (!response.get.list || response.get.list.length === 0) {
        throw new Error('Event not found');
    }

    const event = response.get.list[0];
    const existingOverrides = event.recurrenceOverrides || {};

    // Add the excluded override for this occurrence
    const updatedOverrides = {
        ...existingOverrides,
        [recurrenceId]: {
            excluded: true,
        },
    };

    // Update the event with the new override
    await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: {
                        recurrenceOverrides: updatedOverrides,
                    },
                },
                sendSchedulingMessages: true,
            },
        ])
    );
}

/**
 * Update a single occurrence of a recurring event by adding it to recurrenceOverrides
 */
export async function updateSingleOccurrence(
    accountId: string,
    calendarId: string,
    eventId: string,
    recurrenceId: string,
    updates: UICalendarEventFormData
): Promise<void> {
    const client = getAuthenticatedClient();

    // Fetch the current event to get existing recurrenceOverrides
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
    const existingOverrides = event.recurrenceOverrides || {};

    // Convert form data to JMAP and extract the override fields
    const jmapEvent = CalendarEventUI.toJmap(updates, calendarId);

    // Build the override patch (only include fields that changed)
    const overridePatch: any = {};
    if (jmapEvent.title !== event.title) overridePatch.title = jmapEvent.title;
    if (jmapEvent.start !== recurrenceId) overridePatch.start = jmapEvent.start;
    if (jmapEvent.duration) overridePatch.duration = jmapEvent.duration;
    if (jmapEvent.description) overridePatch.description = jmapEvent.description;
    if (jmapEvent.locations) overridePatch.locations = jmapEvent.locations;
    if (jmapEvent.virtualLocations) overridePatch.virtualLocations = jmapEvent.virtualLocations;

    // Add the override for this occurrence
    const updatedOverrides = {
        ...existingOverrides,
        [recurrenceId]: overridePatch,
    };

    // Update the event with the new override
    await withAuthHandling(() =>
        client.request([
            'CalendarEvent/set' as any,
            {
                accountId,
                update: {
                    [eventId]: {
                        recurrenceOverrides: updatedOverrides,
                    },
                },
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

    // Get the default identity from cache
    const defaultIdentity = await getDefaultIdentity(accountId);
    const scheduleId = `mailto:${defaultIdentity.email}`;

    // Get the event to find the user's participant ID
    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const get = ref.CalendarEvent.get({
                accountId,
                ids: [eventId],
            });

            return { get };
        })
    );

    if (!response.get.list || response.get.list.length === 0) {
        throw new Error('Event not found');
    }

    const event = response.get.list[0];

    // Find the participant entry by matching scheduleId or sendTo
    let userParticipantId: string | null = null;
    if (event.participants) {
        for (const [participantId, participant] of Object.entries(
            event.participants as Record<string, any>
        )) {
            // Match by scheduleId or sendTo.imip
            if (participant.scheduleId === scheduleId || 
                (participant.sendTo?.imip === scheduleId)) {
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
                sendSchedulingMessages: true,
            },
        ])
    );
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
        if (!event.recurrenceRule) {
            // Non-recurring event - add as is
            expandedEvents.push(event);
            continue;
        }

        // Calculate event duration
        const durationMs = event.end.getTime() - event.start.getTime();
        const duration = formatDuration(durationMs);

        const occurrences = generateOccurrencesFromRule(
            event.recurrenceRule,
            event.start,
            endDate,
            duration
        );

        const overrides = event.recurrenceOverrides || {};

        // Filter occurrences to be within range and create event instances
        for (const occurrence of occurrences) {
            if (occurrence.start >= startDate && occurrence.start <= endDate) {
                const recurrenceId = formatDateTime(occurrence.start, event.timeZone);
                const override = overrides[recurrenceId];

                // Skip excluded occurrences
                if (override?.excluded) {
                    continue;
                }

                // Create the instance with overrides applied
                const instance: UICalendarEvent = {
                    ...event,
                    id: `${event.id}#${recurrenceId}`, // Unique ID for each occurrence
                    start: occurrence.start,
                    end: occurrence.end,
                    isRecurringEventInstance: true, // Mark as instance of recurring event
                    recurrenceId, // Store the recurrence ID for later use
                };

                // Apply overrides if they exist
                if (override) {
                    if (override.title !== undefined) instance.title = override.title;
                    if (override.start !== undefined) {
                        // Convert string date to Date object
                        const newStart =
                            typeof override.start === 'string'
                                ? new Date(override.start)
                                : override.start;
                        instance.start = newStart;

                        // Recalculate end date if duration is also overridden
                        if ((override as any).duration) {
                            const durationMs = parseDuration(
                                (override as any).duration
                            );
                            instance.end = new Date(newStart.getTime() + durationMs);
                        } else {
                            // Maintain the same duration
                            const originalDuration =
                                occurrence.end.getTime() - occurrence.start.getTime();
                            instance.end = new Date(newStart.getTime() + originalDuration);
                        }
                    }
                    if (override.description !== undefined)
                        instance.description = override.description;
                    if (override.location !== undefined) instance.location = override.location;
                    // Apply other override fields as needed
                }

                expandedEvents.push(instance);
            }
        }
    }

    return expandedEvents;
}


