/**
 * JMAP Calendar types and utilities
 */

export interface JMAPCalendar {
    id: string;
    name: string;
    description?: string;
    color?: string;
    sortOrder?: number;
    isVisible?: boolean;
    isSubscribed?: boolean;
    isDefault?: boolean;
    role?: string;
    shareWith?: Record<string, any>;
    myRights?: {
        mayReadItems: boolean;
        mayAddItems: boolean;
        mayModifyItems: boolean;
        mayRemoveItems: boolean;
        mayAdmin: boolean;
        mayRename: boolean;
        mayDelete: boolean;
    };
}
