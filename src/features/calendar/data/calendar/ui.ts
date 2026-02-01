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
}

export interface UICalendarFormData {
    name: string;
    description?: string;
    color?: string;
}

export function fromJmap(jmapCalendar: any): UICalendar {
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
    };
}

export function toJmap(formData: UICalendarFormData): Partial<any> {
    return {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color || undefined,
    };
}
