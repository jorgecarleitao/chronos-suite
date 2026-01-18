import { jmapService } from './jmapClient';
import { oauthService } from './authService';

/**
 * Handle authentication errors
 */
async function handleAuthError(error: any): Promise<never> {
    if (
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized') ||
        error.message?.includes('authentication')
    ) {
        const refreshToken = oauthService.getRefreshToken();
        if (refreshToken) {
            try {
                await oauthService.refreshAccessToken(refreshToken);
                const newAccessToken = oauthService.getAccessToken();
                if (newAccessToken) {
                    await jmapService.initialize(newAccessToken);
                    throw new Error('TOKEN_REFRESHED');
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
            }
        }
    }
    throw error;
}

async function withAuthHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        await handleAuthError(error);
        if (error instanceof Error && error.message === 'TOKEN_REFRESHED') {
            return await fn();
        }
        throw error;
    }
}

export interface Participant {
    email: string;
    name?: string;
    role?: 'owner' | 'attendee' | 'optional';
    rsvp?: boolean;
    scheduleStatus?: 'needs-action' | 'accepted' | 'declined' | 'tentative';
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
    description?: string;
    participants?: Participant[];
}

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
            const participants: Participant[] = [];
            if (event.participants) {
                Object.values(event.participants).forEach((p: any) => {
                    if (p.email) {
                        participants.push({
                            email: p.email,
                            name: p.name,
                            role: Object.keys(p.roles || {})[0] as
                                | 'owner'
                                | 'attendee'
                                | 'optional',
                            rsvp: p.expectReply,
                            scheduleStatus: p.scheduleStatus,
                        });
                    }
                });
            }

            return {
                id: event.id,
                title: event.title || '(No title)',
                start: startDate,
                end: endDate,
                calendarId: Object.keys(event.calendarIds || {})[0],
                description: event.description,
                participants: participants.length > 0 ? participants : undefined,
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
        console.log('Creating event with participants:', event.participants);

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
                organizer: {
                    '@type': 'Participant',
                    name: defaultIdentity.name || defaultIdentity.email,
                    email: defaultIdentity.email,
                    sendTo: {
                        imip: `mailto:${defaultIdentity.email}`,
                    },
                    roles: {
                        owner: true,
                    },
                    participationStatus: 'accepted',
                    expectReply: false,
                },
            };

            // Add other participants as attendees
            event.participants.forEach((participant, index) => {
                const participantId = `attendee-${index}`;
                calendarEvent.participants[participantId] = {
                    '@type': 'Participant',
                    name: participant.name || participant.email,
                    email: participant.email,
                    sendTo: {
                        imip: `mailto:${participant.email}`,
                    },
                    roles: {
                        [participant.role || 'attendee']: true,
                    },
                    participationStatus: 'needs-action',
                    expectReply: participant.rsvp !== false,
                };
            });
        }

        console.log('Final calendarEvent being sent:', JSON.stringify(calendarEvent, null, 2));

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

        console.log('Server returned event:', JSON.stringify(getResponse.list[0], null, 2));

        const createdEvent = getResponse.list[0];

        // Parse participants from the retrieved event
        const retrievedParticipants: Participant[] = [];
        if (createdEvent?.participants) {
            Object.values(createdEvent.participants).forEach((p: any) => {
                if (p.email) {
                    retrievedParticipants.push({
                        email: p.email,
                        name: p.name,
                        role: Object.keys(p.roles || {})[0] as 'owner' | 'attendee' | 'optional',
                        rsvp: p.expectReply,
                        scheduleStatus: p.scheduleStatus,
                    });
                }
            });
        }

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
                organizer: {
                    '@type': 'Participant',
                    name: defaultIdentity.name || defaultIdentity.email,
                    email: defaultIdentity.email,
                    sendTo: {
                        imip: `mailto:${defaultIdentity.email}`,
                    },
                    roles: {
                        owner: true,
                    },
                    participationStatus: 'accepted',
                    expectReply: false,
                },
            };

            // Add other participants
            updates.participants.forEach((participant, index) => {
                const participantId = `attendee-${index}`;
                patch.participants[participantId] = {
                    '@type': 'Participant',
                    name: participant.name || participant.email,
                    email: participant.email,
                    sendTo: {
                        imip: `mailto:${participant.email}`,
                    },
                    roles: {
                        [participant.role || 'attendee']: true,
                    },
                    participationStatus: participant.scheduleStatus || 'needs-action',
                    expectReply: participant.rsvp !== false,
                };
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
