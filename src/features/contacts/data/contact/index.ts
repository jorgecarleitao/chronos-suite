/**
 * Contact module - JMAP and UI interfaces with conversion utilities
 */

// Re-export JMAP types (server format)
export type {
    ContactCard,
    NameComponent,
    EmailAddress,
    Phone,
    Address,
    Organization,
    Title,
} from './jmap';

// Re-export UI namespace
import * as UI from './ui';
export { UI };

// Re-export UI types for convenience (client format)
export type { UIContact, UIContactFormData } from './ui';

// Re-export actions namespace
import * as actions from './actions';
export { actions };
