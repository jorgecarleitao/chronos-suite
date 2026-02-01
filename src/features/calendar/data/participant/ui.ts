import type { Participant, JmapParticipant, ParticipationStatus } from './jmap';

export interface UIParticipant {
    email: string;
    name?: string;
    required: boolean; // Maps to expectReply in JMAP
}

export function toJmap(ui: UIParticipant, index: number): [string, Participant] {
    const participant: Participant = {
        '@type': 'Participant',
        email: ui.email,
        name: ui.name,
        calendarAddress: `mailto:${ui.email}`,
        roles: { attendee: true },
        participationStatus: 'needs-action',
        expectReply: ui.required,
    };
    return [`participant${index}`, participant];
}

export function toJmapRecord(uiParticipants: UIParticipant[]): Record<string, Participant> {
    return Object.fromEntries(uiParticipants.map((ui, index) => toJmap(ui, index)));
}

export function fromJmap(
    jmapParticipants?: Record<string, Participant>,
    userEmail?: string
): UIParticipant[] {
    if (!jmapParticipants) {
        return [];
    }

    return Object.values(jmapParticipants)
        .filter((p) => !userEmail || p.email !== userEmail) // Exclude current user
        .map((p) => ({
            email: p.email || '',
            name: p.name,
            required: p.expectReply !== false,
        }))
        .filter((p) => p.email); // Filter out participants without email
}

export function parseJmap(
    jmapParticipants?: Record<string, Participant>,
    userEmail?: string
): {
    participants: Record<string, Participant>;
    userParticipationStatus?: ParticipationStatus;
} {
    if (!jmapParticipants) {
        return { participants: {} };
    }

    let userParticipationStatus: ParticipationStatus | undefined;

    // Find user's participation status
    if (userEmail) {
        for (const participant of Object.values(jmapParticipants)) {
            if (participant.email === userEmail) {
                userParticipationStatus = participant.participationStatus;
                break;
            }
        }
    }

    return {
        participants: jmapParticipants,
        userParticipationStatus,
    };
}

export function createJmapParticipant(participant: Participant): JmapParticipant {
    return {
        '@type': 'Participant',
        name: participant.name,
        email: participant.email,
        description: participant.description,
        descriptionContentType: participant.descriptionContentType,
        calendarAddress: participant.calendarAddress,
        kind: participant.kind,
        roles: participant.roles || {},
        participationStatus: participant.participationStatus || 'needs-action',
        expectReply: participant.expectReply ?? true,
        sentBy: participant.sentBy,
        sendTo: participant.email ? { imip: `mailto:${participant.email}` } : undefined,
        delegatedTo: participant.delegatedTo,
        delegatedFrom: participant.delegatedFrom,
        memberOf: participant.memberOf,
    };
}
