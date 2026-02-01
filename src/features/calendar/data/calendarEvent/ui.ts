/**
 * UI-friendly CalendarEvent interface and conversion utilities
 */

import type {
    CalendarEvent as JmapCalendarEvent,
    ParticipationStatus,
    VirtualLocation,
} from './jmap';
import type { UIRecurrencePattern } from '../recurrenceRule/ui';
import type { UIParticipant } from '../participant/ui';
import type { Participant } from '../participant/jmap';
import type { RecurrenceRule } from '../recurrenceRule/jmap';
import { UI as RecurrenceUI } from '../recurrenceRule';
import { UI as ParticipantUI } from '../participant';
import { parseDuration, formatDuration } from '../../../../utils/durationHelpers';
import { formatDateTime } from '../../../../utils/dateHelpers';

// Re-export for convenience
export { parseDuration, formatDuration };

/**
 * Recurrence override can either exclude an occurrence or modify its properties
 */
export interface RecurrenceOverride extends Partial<UICalendarEvent> {
    excluded?: boolean;
}

/**
 * UI-friendly calendar event (client representation with Date objects)
 */
export interface UICalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
    description?: string;
    location?: string;
    virtualLocations?: Record<string, VirtualLocation>;
    participants?: Record<string, Participant>;
    organizerCalendarAddress?: string;
    userParticipationStatus?: ParticipationStatus;
    timeZone?: string;
    showWithoutTime?: boolean;
    recurrenceRule?: RecurrenceRule;
    recurrenceOverrides?: Record<string, RecurrenceOverride>;
    isRecurringEventInstance?: boolean;
    recurrenceId?: string; // ISO 8601 date-time for the original occurrence this instance represents
}

/**
 * UI-friendly calendar event form data
 */
export interface UICalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    description: string;
    location?: string;
    virtualLocation?: string; // Virtual meeting link (e.g., Zoom, Teams)
    participants?: UIParticipant[];
    timeZone?: string; // IANA timezone identifier
    showWithoutTime?: boolean; // All-day event flag
    recurrence?: UIRecurrencePattern; // Recurrence pattern for the event
}

/**
 * Convert JMAP CalendarEvent to UI CalendarEvent
 */
export function fromJmap(jmapEvent: JmapCalendarEvent, userEmail?: string): UICalendarEvent {
    const startDate = new Date(jmapEvent.start);
    let endDate = startDate;

    // Parse duration to calculate end date
    if (jmapEvent.duration) {
        const durationMs = parseDuration(jmapEvent.duration);
        endDate = new Date(startDate.getTime() + durationMs);
    }

    // Parse participants
    const { participants, userParticipationStatus } = ParticipantUI.parseJmap(
        jmapEvent.participants,
        userEmail
    );

    // Parse location from locations object
    let location: string | undefined;
    if (jmapEvent.locations) {
        const firstLocation = Object.values(jmapEvent.locations)[0];
        if (firstLocation && firstLocation.name) {
            location = firstLocation.name;
        }
    }

    return {
        id: jmapEvent.id || '',
        title: jmapEvent.title || '(No title)',
        start: startDate,
        end: endDate,
        calendarId: jmapEvent.calendarIds ? Object.keys(jmapEvent.calendarIds)[0] : undefined,
        description: jmapEvent.description,
        location,
        virtualLocations: jmapEvent.virtualLocations,
        participants: Object.keys(participants).length > 0 ? participants : undefined,
        userParticipationStatus,
        timeZone: jmapEvent.timeZone,
        showWithoutTime: jmapEvent.showWithoutTime || false,
        recurrenceRule: jmapEvent.recurrenceRule,
        recurrenceOverrides: jmapEvent.recurrenceOverrides,
    };
}

/**
 * Convert UI form data to JMAP CalendarEvent
 */
export function toJmap(
    formData: UICalendarEventFormData,
    calendarId: string,
    eventId?: string
): JmapCalendarEvent {
    const durationMs = formData.end.getTime() - formData.start.getTime();
    const duration = formatDuration(durationMs);

    // Format start time based on whether we have a timezone
    const startString = formatDateTime(
        formData.start,
        formData.showWithoutTime ? undefined : formData.timeZone
    );

    const event: JmapCalendarEvent = {
        '@type': 'Event',
        calendarIds: { [calendarId]: true },
        title: formData.title || '',
        start: startString,
        duration,
    };

    if (eventId) {
        event.id = eventId;
    }

    // Add timezone if provided (and not an all-day event)
    if (formData.timeZone && !formData.showWithoutTime) {
        event.timeZone = formData.timeZone;
    }

    // Add all-day flag if set
    if (formData.showWithoutTime) {
        event.showWithoutTime = true;
    }

    if (formData.description) {
        event.description = formData.description;
    }

    // Add location if provided
    if (formData.location) {
        event.locations = {
            location1: {
                '@type': 'Location',
                name: formData.location,
            },
        };
    }

    // Add virtual location if provided
    if (formData.virtualLocation) {
        event.virtualLocations = {
            virtual1: {
                '@type': 'VirtualLocation',
                uri: formData.virtualLocation,
            },
        };
    }

    // Add recurrence rule if provided
    if (formData.recurrence && formData.recurrence.frequency !== 'none') {
        const recurrenceRule = RecurrenceUI.toJmap(formData.recurrence);
        if (recurrenceRule) {
            event.recurrenceRule = recurrenceRule;
        }
    }

    // Add participants if provided
    if (formData.participants && formData.participants.length > 0) {
        const jmapParticipants = ParticipantUI.toJmapRecord(formData.participants);
        event.participants = Object.fromEntries(
            Object.entries(jmapParticipants).map(([id, participant]) => [
                id,
                ParticipantUI.createJmapParticipant(participant),
            ])
        );
    }

    return event;
}

/**
 * Convert UI CalendarEvent to form data
 */
export function toFormData(event: UICalendarEvent, userEmail?: string): UICalendarEventFormData {
    const formData: UICalendarEventFormData = {
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.description || '',
        location: event.location,
        timeZone: event.timeZone,
        showWithoutTime: event.showWithoutTime,
    };

    // Convert virtual location
    if (event.virtualLocations) {
        const firstVirtualLocation = Object.values(event.virtualLocations)[0];
        if (firstVirtualLocation) {
            formData.virtualLocation = firstVirtualLocation.uri;
        }
    }

    // Convert participants
    if (event.participants) {
        formData.participants = ParticipantUI.fromJmap(event.participants, userEmail);
    }

    // Convert recurrence
    if (event.recurrenceRule) {
        formData.recurrence = RecurrenceUI.fromJmap(event.recurrenceRule);
    }

    return formData;
}
