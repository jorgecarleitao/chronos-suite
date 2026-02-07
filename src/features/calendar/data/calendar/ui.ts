export interface UICalendarPermissions {
    mayReadFreeBusy: boolean;
    mayReadItems: boolean;
    mayWriteAll: boolean;
    mayWriteOwn: boolean;
    mayUpdatePrivate: boolean;
    mayRSVP: boolean;
    mayAdmin: boolean;
}

export interface UIShareRights {
    mayReadFreeBusy: boolean;
    mayReadItems: boolean;
    mayWriteAll: boolean;
    mayWriteOwn: boolean;
    mayUpdatePrivate: boolean;
    mayRSVP: boolean;
    mayAdmin: boolean;
}

export interface UICalendar {
    id: string;
    name: string;
    description?: string;
    color?: string;
    sortOrder?: number;
    isVisible?: boolean;
    isDefault?: boolean;
    isEditable: boolean;
    isDeletable: boolean;
    permissions?: UICalendarPermissions;
    shareWith?: Record<string, UIShareRights>;
}

export interface UICalendarFormData {
    name: string;
    description?: string;
    color?: string;
    shareWith?: Record<string, UIShareRights>;
}

export function fromJmap(jmapCalendar: any): UICalendar {
    const shareWith: Record<string, UIShareRights> = {};
    if (jmapCalendar.shareWith) {
        for (const [principalId, rights] of Object.entries(jmapCalendar.shareWith)) {
            const jmapRights = rights as any;
            shareWith[principalId] = {
                mayReadFreeBusy: jmapRights.mayReadFreeBusy !== false,
                mayReadItems: jmapRights.mayReadItems !== false,
                mayWriteAll: jmapRights.mayWriteAll !== false,
                mayWriteOwn: jmapRights.mayWriteOwn !== false,
                mayUpdatePrivate: jmapRights.mayUpdatePrivate !== false,
                mayRSVP: jmapRights.mayRSVP !== false,
                mayAdmin: jmapRights.mayAdmin !== false,
            };
        }
    }

    return {
        id: jmapCalendar.id,
        name: jmapCalendar.name || 'Unnamed Calendar',
        description: jmapCalendar.description,
        color: jmapCalendar.color,
        sortOrder: jmapCalendar.sortOrder ?? 0,
        isVisible: jmapCalendar.isVisible !== false,
        isDefault: jmapCalendar.isDefault === true,
        isEditable: jmapCalendar.myRights?.mayRename !== false,
        isDeletable: jmapCalendar.myRights?.mayDelete !== false && jmapCalendar.isDefault !== true,
        permissions: jmapCalendar.myRights
            ? {
                  mayReadFreeBusy: jmapCalendar.myRights.mayReadFreeBusy !== false,
                  mayReadItems: jmapCalendar.myRights.mayReadItems !== false,
                  mayWriteAll: jmapCalendar.myRights.mayWriteAll !== false,
                  mayWriteOwn: jmapCalendar.myRights.mayWriteOwn !== false,
                  mayUpdatePrivate: jmapCalendar.myRights.mayUpdatePrivate !== false,
                  mayRSVP: jmapCalendar.myRights.mayRSVP !== false,
                  mayAdmin: jmapCalendar.myRights.mayAdmin !== false,
              }
            : undefined,
        shareWith: Object.keys(shareWith).length > 0 ? shareWith : undefined,
    };
}

export function toJmap(formData: UICalendarFormData): Partial<any> {
    const result: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color || undefined,
    };

    if (formData.shareWith) {
        result.shareWith = formData.shareWith;
    }

    return result;
}
