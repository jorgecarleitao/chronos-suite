/**
 * JMAP CalendarEvent type following JSCalendar RFC 8984
 * Pure server format from JMAP spec
 */

import type { RecurrenceRule } from '../recurrenceRule/jmap';
import type { Participant } from '../participant/jmap';

export type ParticipationStatus =
    | 'needs-action'
    | 'accepted'
    | 'declined'
    | 'tentative'
    | 'delegated';

export interface VirtualLocation {
    '@type': 'VirtualLocation';
    uri: string; // The URI to join the virtual location
    name?: string; // Display name for the virtual location
    description?: string; // Additional description
}

export interface Location {
    '@type': 'Location';
    name?: string;
    description?: string;
    coordinates?: string; // geo: URI
}

/**
 * JMAP CalendarEvent - Pure JMAP spec format
 * Following JSCalendar RFC 8984
 */
export interface CalendarEvent {
    '@type': 'Event';
    uid?: string;
    id?: string; // Added by server
    title: string;
    start: string; // ISO 8601 date-time
    duration?: string; // ISO 8601 duration
    timeZone?: string;
    showWithoutTime?: boolean;
    description?: string;
    descriptionContentType?: string;
    calendarIds?: Record<string, boolean>;
    locations?: Record<string, Location>;
    virtualLocations?: Record<string, VirtualLocation>;
    participants?: Record<string, Participant>;
    recurrenceRules?: RecurrenceRule[];
    recurrenceOverrides?: Record<string, any>;
    status?: 'confirmed' | 'cancelled' | 'tentative';
    freeBusyStatus?: 'free' | 'busy' | 'tentative' | 'unavailable';
    privacy?: 'public' | 'private' | 'secret';
}
