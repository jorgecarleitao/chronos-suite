/**
 * UI Participant interface and JMAP conversion utilities
 * Handles conversion between JMAP Participant and UI-friendly participant
 */

import type { Participant, JmapParticipant, ParticipationStatus } from './jmap';

/**
 * UI-friendly participant for form editing
 * Simplified interface for common use cases
 */
export interface UIParticipant {
    email: string;
    name?: string;
    required: boolean; // Maps to expectReply in JMAP
}

/**
 * Convert UI participant to JMAP Participant
 * @param ui - UI participant
 * @param index - Index for generating unique participant ID
 * @returns Tuple of [participantId, JmapParticipant]
 */
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

/**
 * Convert multiple UI participants to JMAP participants record
 * @param uiParticipants - Array of UI participants
 * @returns Record of participant IDs to JMAP Participants
 */
export function toJmapRecord(uiParticipants: UIParticipant[]): Record<string, Participant> {
    return Object.fromEntries(uiParticipants.map((ui, index) => toJmap(ui, index)));
}

/**
 * Convert JMAP participants to UI participants array
 * @param jmapParticipants - Record of JMAP participants
 * @param userEmail - Current user's email to filter out
 * @returns Array of UI participants (excluding the user)
 */
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

/**
 * Parse JMAP participants to extract user participation status
 * @param jmapParticipants - Record of JMAP participants
 * @param userEmail - Current user's email
 * @returns Object with participants record and user's participation status
 */
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

/**
 * Create a strict JMAP participant for server submission
 * Ensures all required fields are present
 * @param participant - Partial participant data
 * @returns JmapParticipant with all required fields
 */
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
