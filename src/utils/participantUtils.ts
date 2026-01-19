import { Participant, ParticipantRole, JmapParticipant } from '../types/calendar';

/**
 * Parse a JMAP participant object into our application Participant type
 * Uses JSCalendar-bis format
 */
export function parseJmapParticipant(
    p: any,
    userEmail?: string
): {
    participant: Participant;
    isCurrentUser: boolean;
} {
    // Extract email from scheduleId (JSCalendar-bis format: "mailto:user@example.com")
    let email = p.email;
    if (!email && p.scheduleId) {
        email = p.scheduleId.replace(/^mailto:/i, '');
    }

    const participant: Participant = {
        email,
        name: p.name,
        role: (Object.keys(p.roles || {})[0] as ParticipantRole) || 'attendee',
        rsvp: p.expectReply,
        participationStatus: p.participationStatus,
    };

    return {
        participant,
        isCurrentUser: userEmail ? email === userEmail : false,
    };
}

/**
 * Create a JMAP participant object from our application Participant type
 * Uses minimal participant for better interoperability - server fills scheduleAgent
 */
export function createJmapParticipant(participant: Participant): JmapParticipant {
    return {
        '@type': 'Participant',
        email: participant.email,
        name: participant.name,
        scheduleId: `mailto:${participant.email}`,
        roles: {
            attendee: true,
        },
        participationStatus: participant.participationStatus || 'needs-action',
        expectReply: participant.rsvp !== false,
    };
}

/**
 * Parse all participants from a JMAP event response
 */
export function parseJmapParticipants(
    eventParticipants: any,
    userEmail?: string
): {
    participants: Participant[];
    userParticipationStatus?: 'needs-action' | 'accepted' | 'declined' | 'tentative';
} {
    const participants: Participant[] = [];
    let userParticipationStatus: 'needs-action' | 'accepted' | 'declined' | 'tentative' | undefined;

    if (eventParticipants) {
        Object.values(eventParticipants).forEach((p: any) => {
            const { participant, isCurrentUser } = parseJmapParticipant(p, userEmail);
            // Only add participants with valid email addresses
            if (participant.email) {
                participants.push(participant);

                if (isCurrentUser) {
                    userParticipationStatus = p.participationStatus || 'needs-action';
                }
            }
        });
    }

    return { participants, userParticipationStatus };
}
