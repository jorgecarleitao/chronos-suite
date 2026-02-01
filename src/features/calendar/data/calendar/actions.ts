import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { UICalendar, UICalendarFormData } from './ui';
import * as CalendarUI from './ui';

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

export async function createCalendar(
    accountId: string,
    calendarData: UICalendarFormData
): Promise<UICalendar> {
    const client = getAuthenticatedClient();

    const calendarPayload = CalendarUI.toJmap(calendarData);

    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const set = ref.Calendar.set({
                accountId,
                create: {
                    'new-calendar': calendarPayload,
                },
            });

            const get = ref.Calendar.get({
                accountId,
                ids: set.$ref('/created/new-calendar/id'),
            });

            return { set, get };
        })
    );

    const createdId = response.set.created?.['new-calendar']?.id;
    if (!createdId) {
        throw new Error('Failed to create calendar');
    }

    return CalendarUI.fromJmap(response.get.list[0]);
}

export async function updateCalendar(
    accountId: string,
    calendarId: string,
    calendarData: UICalendarFormData
): Promise<UICalendar> {
    const client = getAuthenticatedClient();

    const calendarPayload = CalendarUI.toJmap(calendarData);

    const [response] = await withAuthHandling(() =>
        client.requestMany((ref) => {
            const set = ref.Calendar.set({
                accountId,
                update: {
                    [calendarId]: calendarPayload,
                },
            });

            const get = ref.Calendar.get({
                accountId,
                ids: [calendarId],
            });

            return { set, get };
        })
    );

    if (!response.set.updated?.[calendarId]) {
        throw new Error('Failed to update calendar');
    }

    return CalendarUI.fromJmap(response.get.list[0]);
}

export async function deleteCalendar(accountId: string, calendarId: string): Promise<void> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'Calendar/set' as any,
            {
                accountId,
                destroy: [calendarId],
                onDestroyRemoveEvents: true,
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
