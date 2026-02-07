import type { JMAPPrincipal } from './jmap';

export type UIPrincipal = JMAPPrincipal;

export function fromJmap(jmapPrincipal: any): UIPrincipal {
    return {
        id: jmapPrincipal.id,
        name: jmapPrincipal.name || 'Unnamed Principal',
        description: jmapPrincipal.description,
        email: jmapPrincipal.email,
        type: jmapPrincipal.type || 'individual',
    };
}
