import { jmapService } from './jmapClient';

export interface Account {
  id: string;
  name: string;
  email: string;
  isPersonal: boolean;
}

/**
 * Get the primary account ID
 */
export async function getPrimaryAccountId(): Promise<string> {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }
  
  return await jmapService.getPrimaryAccountId();
}

/**
 * Get account information
 * Note: Currently jmap-jam doesn't expose full account details via public API,
 * so this returns minimal information based on the account ID
 */
export async function getAccount(accountId: string): Promise<Account> {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  // For now, return basic account info
  // In the future, this could be enhanced if the API exposes more account details
  return {
    id: accountId,
    name: accountId,
    email: accountId,
    isPersonal: true,
  };
}
