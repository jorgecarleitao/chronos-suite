/**
 * Shared calendar-related types
 */

export type ParticipationStatus = 'needs-action' | 'accepted' | 'declined' | 'tentative';

export type ParticipantRole = 'owner' | 'attendee' | 'optional';

export interface Participant {
    email: string;
    name?: string;
    role?: ParticipantRole;
    rsvp?: boolean;
    participationStatus?: ParticipationStatus;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    calendarId?: string;
    description?: string;
    location?: string;
    participants?: Participant[];
    userParticipationStatus?: ParticipationStatus;
}

/**
 * JMAP-specific types
 */
export interface JmapParticipant {
    '@type': 'Participant';
    email: string;
    name?: string;
    scheduleAgent?: 'server' | 'client' | 'none';
    scheduleId?: string;
    roles: Record<string, boolean>;
    participationStatus: ParticipationStatus;
    expectReply: boolean;
}
