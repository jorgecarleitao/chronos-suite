import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { UIPrincipal } from './ui';
import * as PrincipalUI from './ui';

export async function fetchPrincipals(accountId: string): Promise<UIPrincipal[]> {
    const client = getAuthenticatedClient();

    const [response] = await withAuthHandling(() =>
        client.request([
            'Principal/get' as any,
            {
                accountId,
            },
        ])
    );

    return response.list.map((principal: any) => PrincipalUI.fromJmap(principal));
}

export async function searchPrincipals(accountId: string, query: string): Promise<UIPrincipal[]> {
    const client = getAuthenticatedClient();

    try {
        const [response] = await withAuthHandling(() =>
            client.requestMany((ref) => {
                const queryResult = ref.Principal.query({
                    accountId,
                    filter: {
                        text: query,
                    },
                });

                const get = ref.Principal.get({
                    accountId,
                    ids: queryResult.$ref('/ids'),
                });

                return { queryResult, get };
            })
        );

        if (!response.queryResult.ids || response.queryResult.ids.length === 0) {
            return [];
        }

        return response.get.list.map((principal: any) => PrincipalUI.fromJmap(principal));
    } catch (error) {
        console.error('Failed to search principals:', error);
        return [];
    }
}
