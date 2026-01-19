import { Participant, ParticipantRole, JmapParticipant } from '../types/calendar';

/**
 * Parse a JMAP participant object into our application Participant type
 */
export function parseJmapParticipant(
    p: any,
    userEmail?: string
): {
    participant: Participant;
    isCurrentUser: boolean;
} {
    const participant: Participant = {
        email: p.email,
        name: p.name,
        role: (Object.keys(p.roles || {})[0] as ParticipantRole) || 'attendee',
        rsvp: p.expectReply,
        scheduleStatus: p.participationStatus || p.scheduleStatus,
    };

    return {
        participant,
        isCurrentUser: userEmail ? p.email === userEmail : false,
    };
}

/**
 * Create a JMAP participant object from our application Participant type
 */
export function createJmapParticipant(
    participant: Participant,
    participantId: string
): JmapParticipant {
    return {
        '@type': 'Participant',
        name: participant.name || participant.email,
        email: participant.email,
        sendTo: {
            imip: `mailto:${participant.email}`,
        },
        roles: {
            [participant.role || 'attendee']: true,
        },
        participationStatus: participant.scheduleStatus || 'needs-action',
        expectReply: participant.rsvp !== false,
    };
}

/**
 * Create a JMAP organizer participant object
 */
export function createJmapOrganizer(email: string, name?: string): JmapParticipant {
    return {
        '@type': 'Participant',
        name: name || email,
        email,
        sendTo: {
            imip: `mailto:${email}`,
        },
        roles: {
            owner: true,
        },
        participationStatus: 'accepted',
        expectReply: false,
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
            if (p.email) {
                const { participant, isCurrentUser } = parseJmapParticipant(p, userEmail);
                participants.push(participant);

                if (isCurrentUser) {
                    userParticipationStatus = p.participationStatus || 'needs-action';
                }
            }
        });
    }

    return { participants, userParticipationStatus };
}
