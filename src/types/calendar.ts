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

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
    description?: string;
    location?: string;
    participants?: Record<string, Participant>;
    organizerCalendarAddress?: string;
    userParticipationStatus?: ParticipationStatus;
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
