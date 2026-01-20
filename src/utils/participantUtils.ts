import { Participant, JmapParticipant, ParticipationStatus } from '../types/calendar';

/**
 * Parse a JMAP participant object into our application Participant type
 * Follows JSCalendar RFC 8984 format
 */
export function parseJmapParticipant(
    p: any,
    userEmail?: string
): {
    participant: Participant;
    isCurrentUser: boolean;
} {
    const participant: Participant = {
        '@type': 'Participant',
        email: p.email,
        name: p.name,
        description: p.description,
        descriptionContentType: p.descriptionContentType,
        kind: p.kind,
        roles: p.roles,
        participationStatus: p.participationStatus || 'needs-action',
        expectReply: p.expectReply,
        sentBy: p.sentBy,
        delegatedTo: p.delegatedTo,
        delegatedFrom: p.delegatedFrom,
        memberOf: p.memberOf,
        links: p.links,
        progress: p.progress,
        percentComplete: p.percentComplete,
    };

    return {
        participant,
        isCurrentUser: userEmail ? p.email === userEmail : false,
    };
}

/**
 * Create a JMAP participant object from our application Participant type
 * Follows JSCalendar RFC 8984 strictly
 */
export function createJmapParticipant(participant: Participant): JmapParticipant {
    const calendarAddress = `mailto:${participant.email}`;
    const sendTo = { imip: `mailto:${participant.email}` };

    return {
        '@type': 'Participant',
        email: participant.email,
        name: participant.name,
        description: participant.description,
        descriptionContentType: participant.descriptionContentType,
        calendarAddress,
        kind: participant.kind,
        roles: participant.roles || { attendee: true },
        participationStatus: participant.participationStatus || 'needs-action',
        expectReply: participant.expectReply !== false,
        sentBy: participant.sentBy,
        sendTo,
        delegatedTo: participant.delegatedTo,
        delegatedFrom: participant.delegatedFrom,
        memberOf: participant.memberOf,
    };
}

/**
 * Parse all participants from a JMAP event response
 * Returns participants as a map keyed by participant ID
 */
export function parseJmapParticipants(
    eventParticipants: Record<string, any> | undefined,
    userEmail?: string
): {
    participants: Record<string, Participant>;
    userParticipationStatus?: ParticipationStatus;
} {
    const participants: Record<string, Participant> = {};
    let userParticipationStatus: ParticipationStatus | undefined;

    if (eventParticipants) {
        Object.entries(eventParticipants).forEach(([id, p]) => {
            const { participant, isCurrentUser } = parseJmapParticipant(p, userEmail);
            // Only add participants with valid email
            if (participant.email) {
                participants[id] = participant;

                if (isCurrentUser) {
                    userParticipationStatus = p.participationStatus || 'needs-action';
                }
            }
        });
    }

    return { participants, userParticipationStatus };
}

/**
 * Get a display-friendly list of participant emails
 */
export function getParticipantEmails(
    participants: Record<string, Participant> | undefined
): string[] {
    if (!participants) return [];

    return Object.values(participants)
        .map((p) => p.email)
        .filter((email): email is string => !!email);
}

/**
 * Get participant role priority (for display sorting)
 * Higher number = higher priority
 */
export function getParticipantRolePriority(participant: Participant): number {
    if (!participant.roles) return 0;

    if (participant.roles['chair']) return 5;
    if (participant.roles['owner']) return 4;
    if (participant.roles['required']) return 3;
    if (participant.roles['optional']) return 2;
    if (participant.roles['informational']) return 1;

    return 0;
}

/**
 * Convert participants Record to array for UI display
 */
export function participantsToArray(
    participants: Record<string, Participant> | undefined
): Participant[] {
    if (!participants) return [];
    return Object.values(participants);
}

/**
 * Convert participants array to Record for storage
 */
export function participantsToRecord(participants: Participant[]): Record<string, Participant> {
    return Object.fromEntries(
        participants.map((participant, index) => {
            return [`participant${index}`, participant];
        })
    );
}
