import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import MessageViewer from './MessageViewer';
import ComposeEmail, { DraftMessage } from './ComposeEmail';
import MessageListItem from './MessageListItem';
import MessageActionsBar from './MessageActionsBar';
import BulkActionsBar from './BulkActionsBar';
import PaginationBar from './PaginationBar';
import { fetchMessages, fetchMessage, type MessageMetadata, MessageDetail } from '../data/message';
import useMessageOperations from '../useMessageOperations';
import {
    fetchContacts as fetchContactsForLookup,
    type ContactInfo,
} from '../../../data/contactService';
import { getPrimaryAccountId } from '../../../data/accounts';

function messageDetailToDraft(detail: MessageDetail): DraftMessage {
    return {
        to: detail.to || '',
        cc: detail.cc || '',
        bcc: detail.bcc || '',
        subject: detail.subject || '',
        body: detail.textBody || '',
        attachments: detail.attachments || [],
    };
}

interface MessageListProps {
    mailbox: string;
    accountId: string;
    mailboxRole?: string;
    onMailboxChange?: () => void;
}

const PAGE_SIZE = 50;

export default function MessageList({ mailbox, accountId, mailboxRole, onMailboxChange }: MessageListProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<MessageMetadata[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [contactsMap, setContactsMap] = useState<Map<string, ContactInfo>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [draftMessage, setDraftMessage] = useState<MessageDetail | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [messageActions, setMessageActions] = useState<{
        onReply: () => void;
        onReplyAll: () => void;
        onForward: () => void;
        onDelete: () => void;
        onSend: () => void;
        onClose: () => void;
        isDraft: boolean;
        sending: boolean;
    } | null>(null);

    const operations = useMessageOperations({
        accountId: accountId,
        mailboxRole: mailboxRole,
        messages,
        onMessagesChange: () => {
            loadMessages(currentPage);
            if (onMailboxChange) {
                onMailboxChange();
            }
        },
    });

    // Memoize translations to avoid re-creating on every render
    const translations = useMemo(() => ({
        unknownSender: t('message.unknownSender'),
        noSubject: t('messageHeader.noSubject'),
        toggleStar: t('messageList.toggleStar'),
        delete: t('common.delete'),
        attachments: t('attachments.attachments'),
        company: t('contacts.company'),
        title: t('contacts.title'),
        email: t('contacts.email'),
        contactInAddressBook: t('message.contactInAddressBook'),
    }), [t]);

    useEffect(() => {
        setCurrentPage(1);
        loadMessages();
    }, [mailbox]);

    // Batch fetch contacts for all messages - non-blocking
    useEffect(() => {
        if (messages.length === 0) {
            return;
        }

        const fetchContacts = async () => {
            try {
                const accountId = await getPrimaryAccountId();
                const uniqueEmails = Array.from(
                    new Set(
                        messages
                            .map((m) => m.from_email)
                            .filter((email): email is string => !!email)
                    )
                );

                if (uniqueEmails.length === 0) {
                    return;
                }

                const contacts = await fetchContactsForLookup(accountId, uniqueEmails);
                const map = new Map<string, ContactInfo>();
                contacts.forEach((contact) => {
                    if (contact.email) {
                        map.set(contact.email.toLowerCase(), contact);
                    }
                });
                setContactsMap(map);
            } catch (err) {
                console.error('Failed to fetch contacts:', err);
            }
        };

        // Don't block rendering - fetch contacts in background
        fetchContacts();
    }, [messages]);

    async function loadMessages(page = 1) {
        setLoading(true);
        setError(null);
        try {
            const offset = (page - 1) * PAGE_SIZE;
            const data = await fetchMessages(accountId, mailbox, PAGE_SIZE, offset);
            setMessages(data.messages);
            setTotal(data.total);
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('messageList.failedToLoadMessages'));
        } finally {
            setLoading(false);
        }
    }

    const handleMessageClick = useCallback(async (message: MessageMetadata) => {
        if (mailbox.toLowerCase() === 'drafts') {
            try {
                const data = await fetchMessage(accountId, message.id);
                setDraftMessage(data);
                setComposeOpen(true);
            } catch (err) {
                setError(t('messageList.failedToLoadDraft'));
            }
        } else {
            // Update selection state immediately for instant visual feedback
            setSelectedMessage(message.id);
            // Defer opening viewer to not block the UI
            setTimeout(() => setViewerOpen(true), 0);
        }
    }, [accountId, mailbox, t]);

    const handleViewerClose = () => {
        setViewerOpen(false);
        loadMessages(currentPage);
    };

    const handleDeleteClick = useCallback((message: MessageMetadata, event: Event) => {
        event.stopPropagation();
        setMessageToDelete(message.id);

        // Only show confirmation dialog when deleting from Trash
        if (mailbox.toLowerCase() === 'trash') {
            setDeleteDialogOpen(true);
        } else {
            // Delete directly for other mailboxes
            operations.deleteOne(message.id);
        }
    }, [mailbox, operations]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!messageToDelete) return;
        try {
            await operations.deleteOne(messageToDelete);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('messageList.failedToDelete'));
        } finally {
            setDeleteDialogOpen(false);
            setMessageToDelete(null);
        }
    }, [messageToDelete, operations, t]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteDialogOpen(false);
        setMessageToDelete(null);
    }, []);

    const handleToggleStar = useCallback((messageId: string, isFlagged: boolean, event: Event) => {
        event.stopPropagation();
        operations.toggleStar(messageId, isFlagged);
    }, [operations]);

    const handleBulkDeleteConfirm = useCallback(async () => {
        try {
            await operations.bulkDelete();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('messageList.failedToDeleteMultiple'));
        } finally {
            setBulkDeleteDialogOpen(false);
        }
    }, [operations, t]);

    const handleBulkDeleteCancel = useCallback(() => {
        setBulkDeleteDialogOpen(false);
    }, []);

    const handleBulkDeleteClick = useCallback(() => {
        if (operations.selectedIds.size > 0) {
            // Only show confirmation dialog when deleting from Trash
            if (mailbox.toLowerCase() === 'trash') {
                setBulkDeleteDialogOpen(true);
            } else {
                // Delete directly for other mailboxes
                handleBulkDeleteConfirm();
            }
        }
    }, [operations.selectedIds.size, mailbox, handleBulkDeleteConfirm]);

    if (loading) {
        return (
            <Stack justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Stack>
        );
    }

    if (error) {
        return (
            <Box padding={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (messages.length === 0) {
        return (
            <Stack justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">{t('messageList.noMessages')}</Typography>
            </Stack>
        );
    }

    return (
        <Stack height="100%">
            <Paper elevation={0} square>
                {viewerOpen && messageActions ? (
                    <MessageActionsBar
                        isDraft={messageActions.isDraft}
                        sending={messageActions.sending}
                        onReply={messageActions.onReply}
                        onReplyAll={messageActions.onReplyAll}
                        onForward={messageActions.onForward}
                        onSend={messageActions.onSend}
                        onDelete={messageActions.onDelete}
                        onClose={messageActions.onClose}
                    />
                ) : (
                    <BulkActionsBar
                        selectedCount={operations.selectedIds.size}
                        totalCount={total}
                        onSelectAll={operations.toggleSelectAll}
                        onMarkAsRead={operations.bulkMarkAsRead}
                        onMarkAsUnread={operations.bulkMarkAsUnread}
                        onMarkAsFlagged={operations.bulkMarkAsFlagged}
                        onMarkAsUnflagged={operations.bulkMarkAsUnflagged}
                        onDelete={handleBulkDeleteClick}
                        onRefresh={() => loadMessages(currentPage)}
                    />
                )}
                <Divider />
            </Paper>

            {viewerOpen && selectedMessage ? (
                <MessageViewer
                    onClose={handleViewerClose}
                    onDelete={() => loadMessages(currentPage)}
                    onMailboxChange={onMailboxChange}
                    mailbox={mailbox}
                    emailId={selectedMessage}
                    accountId={accountId}
                    renderActions={(actions) => {
                        setMessageActions(actions);
                        return <></>;
                    }}
                />
            ) : (
                <>
                    <List style={{ flexGrow: 1, overflow: 'auto' }}>
                        {messages.map((message) => (
                            <MessageListItem
                                key={message.id}
                                message={message}
                                contact={
                                    message.from_email
                                        ? contactsMap.get(message.from_email.toLowerCase())
                                        : undefined
                                }
                                isSelected={selectedMessage === message.id}
                                isChecked={operations.selectedIds.has(message.id)}
                                onSelect={handleMessageClick}
                                onCheckboxChange={operations.toggleSelection}
                                onDelete={handleDeleteClick}
                                onToggleStar={handleToggleStar}
                                translations={translations}
                            />
                        ))}
                    </List>
                    {total > 0 && (
                        <PaginationBar
                            currentPage={currentPage}
                            totalPages={Math.ceil(total / PAGE_SIZE)}
                            totalMessages={total}
                            pageSize={PAGE_SIZE}
                            onPageChange={(page) => loadMessages(page)}
                        />
                    )}
                </>
            )}

            {/* Compose Email for Drafts */}
            {composeOpen && draftMessage && (
                <ComposeEmail
                    onClose={() => {
                        setComposeOpen(false);
                        setDraftMessage(null);
                    }}
                    fromName={draftMessage.from_name}
                    fromEmail={draftMessage.from_email}
                    message={messageDetailToDraft(draftMessage)}
                    draftEmailId={draftMessage.id}
                    accountId={accountId}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>{t('messageList.deleteMessage')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('messageList.deleteMessageConfirm')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>{t('common.cancel')}</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteDialogOpen} onClose={handleBulkDeleteCancel}>
                <DialogTitle>{t('messageList.deleteMessages')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('messageList.deleteMessagesConfirm', {
                            count: operations.selectedIds.size,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleBulkDeleteCancel}>{t('common.cancel')}</Button>
                    <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
