/**
 * JMAP Participant interfaces following JSCalendar RFC 8984
 * These are the canonical JMAP types received from/sent to the server
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

/**
 * JMAP Participant following JSCalendar RFC 8984
 */
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
    links?: Record<string, any>;
    progress?: ParticipantProgress; // Only for tasks
    percentComplete?: number; // Only for tasks, 0-100
}

/**
 * Strict JMAP Participant (required fields for sending to server)
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
