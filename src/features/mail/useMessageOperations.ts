import { useState, useCallback, useMemo } from 'react';
import {
    MessageMetadata,
    deleteMessages,
    trashMessages,
    markAsRead,
    markAsUnread,
    markAsFlagged,
    markAsUnflagged,
} from './data/message';

interface UseMessageOperationsProps {
    accountId: string;
    mailboxRole?: string;
    messages: MessageMetadata[];
    onMessagesChange: () => void;
}

export interface MessageOperationsState {
    selectedIds: Set<string>;
    selectAll: () => void;
    clearSelection: () => void;
    toggleSelectAll: () => void;
    toggleSelection: (messageId: string) => void;
    bulkDelete: () => Promise<void>;
    bulkMarkAsRead: () => Promise<void>;
    bulkMarkAsUnread: () => Promise<void>;
    bulkMarkAsFlagged: () => Promise<void>;
    bulkMarkAsUnflagged: () => Promise<void>;
    deleteOne: (messageId: string) => Promise<void>;
    toggleStar: (messageId: string, isFlagged: boolean) => Promise<void>;
}

export default function useMessageOperations({
    accountId,
    mailboxRole,
    messages,
    onMessagesChange,
}: UseMessageOperationsProps): MessageOperationsState {
    const [selectedIds, setSelectedIds] = useState(new Set<string>());

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(messages.map((m) => m.id)));
    }, [messages]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === messages.length && messages.length > 0) {
            clearSelection();
        } else {
            selectAll();
        }
    }, [selectedIds.size, messages.length, selectAll, clearSelection]);

    const toggleSelection = useCallback((messageId: string) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    }, []);

    const bulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const ids = Array.from(selectedIds);
            // If we're in the Trash mailbox, permanently delete, otherwise move to trash
            if (mailboxRole === 'trash') {
                await deleteMessages(accountId, ids);
            } else {
                await trashMessages(accountId, ids);
            }
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to delete messages:', error);
            alert('Failed to delete some messages. Please try again.');
        }
    }, [selectedIds, accountId, mailboxRole, clearSelection, onMessagesChange]);

    const bulkMarkAsRead = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) => markAsRead(accountId, id));
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
            alert('Failed to mark messages as read. Please try again.');
        }
    }, [selectedIds, accountId, clearSelection, onMessagesChange]);

    const bulkMarkAsUnread = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) => markAsUnread(accountId, id));
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to mark messages as unread:', error);
            alert('Failed to mark messages as unread. Please try again.');
        }
    }, [selectedIds, accountId, clearSelection, onMessagesChange]);

    const deleteOne = useCallback(
        async (messageId: string) => {
            try {
                // If we're in the Trash mailbox, permanently delete, otherwise move to trash
                if (mailboxRole === 'trash') {
                    await deleteMessages(accountId, [messageId]);
                } else {
                    await trashMessages(accountId, [messageId]);
                }
                onMessagesChange();
            } catch (error) {
                console.error('Failed to delete message:', error);
                alert('Failed to delete message. Please try again.');
            }
        },
        [accountId, mailboxRole, onMessagesChange]
    );

    const bulkMarkAsFlagged = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) => markAsFlagged(accountId, id));
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to star messages:', error);
            alert('Failed to star messages. Please try again.');
        }
    }, [selectedIds, accountId, clearSelection, onMessagesChange]);

    const bulkMarkAsUnflagged = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) =>
                markAsUnflagged(accountId, id)
            );
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to unstar messages:', error);
            alert('Failed to unstar messages. Please try again.');
        }
    }, [selectedIds, accountId, clearSelection, onMessagesChange]);

    const toggleStar = useCallback(
        async (messageId: string, isFlagged: boolean) => {
            try {
                if (isFlagged) {
                    await markAsUnflagged(accountId, messageId);
                } else {
                    await markAsFlagged(accountId, messageId);
                }
                onMessagesChange();
            } catch (error) {
                console.error('Failed to toggle star:', error);
                alert('Failed to toggle star. Please try again.');
            }
        },
        [accountId, onMessagesChange]
    );

    return useMemo(() => ({
        selectedIds,
        selectAll,
        clearSelection,
        toggleSelectAll,
        toggleSelection,
        bulkDelete,
        bulkMarkAsRead,
        bulkMarkAsUnread,
        bulkMarkAsFlagged,
        bulkMarkAsUnflagged,
        deleteOne,
        toggleStar,
    }), [
        selectedIds,
        selectAll,
        clearSelection,
        toggleSelectAll,
        toggleSelection,
        bulkDelete,
        bulkMarkAsRead,
        bulkMarkAsUnread,
        bulkMarkAsFlagged,
        bulkMarkAsUnflagged,
        deleteOne,
        toggleStar,
    ]);
}
