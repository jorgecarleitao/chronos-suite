import { useEffect } from 'preact/hooks';

/**
 * Custom hook to update the document title
 * @param title - The title to set
 */
export function useDocumentTitle(title: string | null) {
    useEffect(() => {
        if (title) {
            document.title = title;
        }

        // Cleanup: restore default title on unmount
        return () => {
            document.title = 'Chronos Suite';
        };
    }, [title]);
}
