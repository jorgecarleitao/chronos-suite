export interface JMAPShareRights {
    mayReadFreeBusy?: boolean;
    mayReadItems?: boolean;
    mayWriteAll?: boolean;
    mayWriteOwn?: boolean;
    mayUpdatePrivate?: boolean;
    mayRSVP?: boolean;
    mayAdmin?: boolean;
}

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
    shareWith?: Record<string, JMAPShareRights>;
    myRights?: {
        mayReadFreeBusy: boolean;
        mayReadItems: boolean;
        mayWriteAll: boolean;
        mayWriteOwn: boolean;
        mayUpdatePrivate: boolean;
        mayRSVP: boolean;
        mayAdmin: boolean;
        mayRename: boolean;
        mayDelete: boolean;
    };
}
