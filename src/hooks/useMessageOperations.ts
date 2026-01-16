import { useState, useCallback } from 'preact/hooks';
import { MessageMetadata, deleteMessage, markAsRead, markAsUnread } from '../data/messages';

interface UseMessageOperationsProps {
    mailboxId: string;
    messages: MessageMetadata[];
    onMessagesChange: () => void;
}

export interface MessageOperationsState {
    selectedIds: Set<string>;
    selectAll: () => void;
    clearSelection: () => void;
    toggleSelection: (messageId: string) => void;
    bulkDelete: () => Promise<void>;
    bulkMarkAsRead: () => Promise<void>;
    bulkMarkAsUnread: () => Promise<void>;
    deleteOne: (messageId: string) => Promise<void>;
}

export default function useMessageOperations({
    mailboxId,
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
            const deletePromises = Array.from(selectedIds).map((id) => deleteMessage(mailboxId, id));
            await Promise.all(deletePromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to delete messages:', error);
            alert('Failed to delete some messages. Please try again.');
        }
    }, [selectedIds, mailboxId, clearSelection, onMessagesChange]);

    const bulkMarkAsRead = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) => markAsRead(mailboxId, id));
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
            alert('Failed to mark messages as read. Please try again.');
        }
    }, [selectedIds, mailboxId, clearSelection, onMessagesChange]);

    const bulkMarkAsUnread = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const markPromises = Array.from(selectedIds).map((id) => markAsUnread(mailboxId, id));
            await Promise.all(markPromises);
            clearSelection();
            onMessagesChange();
        } catch (error) {
            console.error('Failed to mark messages as unread:', error);
            alert('Failed to mark messages as unread. Please try again.');
        }
    }, [selectedIds, mailboxId, clearSelection, onMessagesChange]);

    const deleteOne = useCallback(
        async (messageId: string) => {
            try {
                await deleteMessage(mailboxId, messageId);
                onMessagesChange();
            } catch (error) {
                console.error('Failed to delete message:', error);
                alert('Failed to delete message. Please try again.');
            }
        },
        [mailboxId, onMessagesChange]
    );

    return {
        selectedIds,
        selectAll,
        clearSelection,
        toggleSelection,
        bulkDelete,
        bulkMarkAsRead,
        bulkMarkAsUnread,
        deleteOne,
    };
}
