/**
 * Shared calendar-related types following JSCalendar RFC 8984
 */

export type ParticipationStatus =
    | 'needs-action'
    | 'accepted'
    | 'declined'
    | 'tentative'
    | 'delegated';
export type ParticipantRole = 'owner' | 'attendee' | 'chair' | 'contact' | 'organizer';
export type ParticipantKind = 'individual' | 'group' | 'location' | 'resource';
export type ParticipantProgress = 'in-process' | 'completed' | 'failed';

export interface Participant {
    '@type'?: 'Participant';
    name?: string;
    email?: string;
    description?: string;
    descriptionContentType?: string;
    calendarAddress?: string;
    kind?: ParticipantKind;
    roles?: Partial<Record<ParticipantRole, boolean>>;
    participationStatus?: ParticipationStatus;
    expectReply?: boolean;
    sentBy?: string;
    delegatedTo?: Record<string, boolean>;
    delegatedFrom?: Record<string, boolean>;
    memberOf?: Record<string, boolean>;
    links?: Record<string, any>; // Link type can be defined later if needed
    progress?: ParticipantProgress; // Only for tasks
    percentComplete?: number; // Only for tasks, 0-100
}

export interface VirtualLocation {
    '@type': 'VirtualLocation';
    uri: string; // The URI to join the virtual location
    name?: string; // Display name for the virtual location
    description?: string; // Additional description
}

/**
 * JMAP RecurrenceRule following JSCalendar RFC 8984
 */
export interface RecurrenceRule {
    '@type': 'RecurrenceRule';
    frequency: 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutely' | 'secondly';
    interval?: number; // Default is 1
    rscale?: string; // Calendar system (default is 'gregorian')
    skip?: 'omit' | 'backward' | 'forward'; // How to handle invalid dates
    firstDayOfWeek?: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su'; // Default is 'mo'
    byDay?: Array<NDay | string>; // Days of week/month
    byMonthDay?: number[]; // Days of month (1-31, negative for end of month)
    byMonth?: string[]; // Months (1-12 as strings)
    byYearDay?: number[]; // Days of year (1-366, negative for end of year)
    byWeekNo?: number[]; // Week numbers (1-53, negative for end of year)
    byHour?: number[]; // Hours (0-23)
    byMinute?: number[]; // Minutes (0-59)
    bySecond?: number[]; // Seconds (0-60 for leap seconds)
    bySetPosition?: number[]; // Positions in the recurrence set
    count?: number; // Maximum number of occurrences
    until?: string; // ISO 8601 date-time or date
}

/**
 * NDay object for byDay in RecurrenceRule (JSCalendar RFC 8984)
 */
export interface NDay {
    '@type': 'NDay';
    day: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su';
    nthOfPeriod?: number; // e.g., 1 for first Monday, -1 for last Monday
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
    description?: string;
    location?: string;
    virtualLocations?: Record<string, VirtualLocation>; // Virtual meeting links
    participants?: Record<string, Participant>;
    organizerCalendarAddress?: string;
    userParticipationStatus?: ParticipationStatus;
    timeZone?: string; // IANA timezone identifier (e.g., 'America/New_York')
    showWithoutTime?: boolean; // All-day event flag
    // Recurrence fields following JSCalendar RFC 8984 format (JMAP RecurrenceRule)
    recurrenceRules?: RecurrenceRule[]; // Array of JMAP RecurrenceRule objects (standard JMAP format)
    recurrenceOverrides?: Record<string, Partial<CalendarEvent>>; // Exceptions to recurrence pattern
    isRecurringEventInstance?: boolean; // Indicates if this is an instance of a recurring event
}

/**
 * JMAP-specific types
 * Note: JmapParticipant should follow JSCalendar RFC 8984 strictly
 */
export interface JmapParticipant {
    '@type': 'Participant';
    name?: string;
    email?: string;
    description?: string;
    descriptionContentType?: string;
    calendarAddress?: string;
    kind?: ParticipantKind;
    roles: Record<string, boolean>;
    participationStatus: ParticipationStatus;
    expectReply: boolean;
    sentBy?: string;
    sendTo?: {
        imip?: string;
    };
    delegatedTo?: Record<string, boolean>;
    delegatedFrom?: Record<string, boolean>;
    memberOf?: Record<string, boolean>;
}
