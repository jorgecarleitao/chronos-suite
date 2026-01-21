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
