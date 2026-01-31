/**
 * Calendar CRUD operations
 * Handles all server interactions for calendar management
 */

import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { UICalendar, UICalendarFormData } from './ui';
import * as CalendarUI from './ui';

/**
 * Fetch all calendars for the account
 */
export async function fetchCalendars(accountId: string): Promise<UICalendar[]> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/get' as any,
            {
                accountId,
            },
        ])
    );

    return response.list.map((calendar: any) => CalendarUI.fromJmap(calendar));
}

/**
 * Create a new calendar
 */
export async function createCalendar(
    accountId: string,
    calendarData: UICalendarFormData
): Promise<UICalendar> {
    const client = getAuthenticatedClient();

    const calendarPayload = CalendarUI.toJmap(calendarData);

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/set' as any,
            {
                accountId,
                create: {
                    'new-calendar': calendarPayload,
                },
            },
        ])
    );

    const createdId = response.created?.['new-calendar']?.id;
    if (!createdId) {
        throw new Error('Failed to create calendar');
    }

    // Fetch the created calendar to get full details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'Calendar/get' as any,
            {
                accountId,
                ids: [createdId],
            },
        ])
    );

    return CalendarUI.fromJmap(getResponse.list[0]);
}

/**
 * Update an existing calendar
 */
export async function updateCalendar(
    accountId: string,
    calendarId: string,
    calendarData: UICalendarFormData
): Promise<UICalendar> {
    const client = getAuthenticatedClient();

    const calendarPayload = CalendarUI.toJmap(calendarData);

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/set' as any,
            {
                accountId,
                update: {
                    [calendarId]: calendarPayload,
                },
            },
        ])
    );

    if (!response.updated?.[calendarId]) {
        throw new Error('Failed to update calendar');
    }

    // Fetch the updated calendar to get full details
    const [getResponse] = await withAuthHandling(() =>
        client.request([
            'Calendar/get' as any,
            {
                accountId,
                ids: [calendarId],
            },
        ])
    );

    return CalendarUI.fromJmap(getResponse.list[0]);
}

/**
 * Delete a calendar (and all its events)
 */
export async function deleteCalendar(accountId: string, calendarId: string): Promise<void> {
    const client = getAuthenticatedClient();

    // First, fetch all events in this calendar
    const [queryResponse] = await withAuthHandling(() =>
        client.request([
            'CalendarEvent/query' as any,
            {
                accountId,
                filter: {
                    inCalendar: calendarId,
                },
            },
        ])
    );

    // Delete all events in the calendar first
    if (queryResponse.ids && queryResponse.ids.length > 0) {
        await withAuthHandling(() =>
            client.request([
                'CalendarEvent/set' as any,
                {
                    accountId,
                    destroy: queryResponse.ids,
                },
            ])
        );
    }

    // Now delete the calendar
    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/set' as any,
            {
                accountId,
                destroy: [calendarId],
            },
        ])
    );

    if (response.notDestroyed && response.notDestroyed[calendarId]) {
        const error = response.notDestroyed[calendarId];
        throw new Error(error.description || 'Failed to delete calendar');
    }

    if (!response.destroyed?.includes(calendarId)) {
        throw new Error('Failed to delete calendar');
    }
}
