import { useState, useEffect } from 'preact/hooks';
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
import { fetchMessages, fetchMessage, MessageMetadata } from '../data/messages';
import useMessageOperations from '../useMessageOperations';

interface MessageListProps {
    mailbox: string;
    accountId: string;
    onMailboxChange?: () => void;
}

const PAGE_SIZE = 50;

export default function MessageList({ mailbox, accountId, onMailboxChange }: MessageListProps) {
    const [messages, setMessages] = useState<MessageMetadata[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [draftMessage, setDraftMessage] = useState<any | null>(null);
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
        mailboxId: accountId,
        messages,
        onMessagesChange: () => {
            loadMessages(currentPage);
            if (onMailboxChange) {
                onMailboxChange();
            }
        },
    });

    useEffect(() => {
        setCurrentPage(1);
        loadMessages();
    }, [mailbox]);

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
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }

    const handleMessageClick = async (message: MessageMetadata) => {
        if (mailbox.toLowerCase() === 'drafts') {
            try {
                const data = await fetchMessage(accountId, message.id);
                setDraftMessage(data);
                setComposeOpen(true);
            } catch (err) {
                setError('Failed to load draft for editing');
            }
        } else {
            setSelectedMessage(message.id);
            setViewerOpen(true);
        }
    };

    const handleViewerClose = () => {
        setViewerOpen(false);
        loadMessages(currentPage);
    };

    const handleDeleteClick = (message: MessageMetadata, event: Event) => {
        event.stopPropagation();
        setMessageToDelete(message.id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!messageToDelete) return;
        try {
            await operations.deleteOne(messageToDelete);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete message');
        } finally {
            setDeleteDialogOpen(false);
            setMessageToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setMessageToDelete(null);
    };

    const handleBulkDeleteClick = () => {
        if (operations.selectedIds.size > 0) {
            setBulkDeleteDialogOpen(true);
        }
    };

    const handleBulkDeleteConfirm = async () => {
        try {
            await operations.bulkDelete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete messages');
        } finally {
            setBulkDeleteDialogOpen(false);
        }
    };

    const handleBulkDeleteCancel = () => {
        setBulkDeleteDialogOpen(false);
    };

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
                <Typography color="text.secondary">No messages in this mailbox</Typography>
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
                                isSelected={selectedMessage === message.id}
                                isChecked={operations.selectedIds.has(message.id)}
                                onSelect={handleMessageClick}
                                onCheckboxChange={operations.toggleSelection}
                                onDelete={handleDeleteClick}
                                onToggleStar={(messageId, isFlagged, event) => {
                                    event.stopPropagation();
                                    operations.toggleStar(messageId, isFlagged);
                                }}
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
                    open={composeOpen}
                    onClose={() => {
                        setComposeOpen(false);
                        setDraftMessage(null);
                    }}
                    mailbox={mailbox}
                    fromName={draftMessage.from_name}
                    fromEmail={draftMessage.from_email}
                    message={{
                        to: draftMessage.to || '',
                        cc: draftMessage.cc || '',
                        bcc: draftMessage.bcc || '',
                        subject: draftMessage.subject || '',
                        body: draftMessage.textBody || '',
                    }}
                    draftEmailId={draftMessage.id}
                    accountId={accountId}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Delete Message</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this message?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteDialogOpen} onClose={handleBulkDeleteCancel}>
                <DialogTitle>Delete Messages</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete {operations.selectedIds.size} message(s)?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleBulkDeleteCancel}>Cancel</Button>
                    <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
