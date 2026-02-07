export interface JMAPPrincipal {
    id: string;
    name: string;
    description?: string;
    email?: string;
    type: 'individual' | 'group' | 'resource' | 'location' | 'other';
    accountId?: string;
}
