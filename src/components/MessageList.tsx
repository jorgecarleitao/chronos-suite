import { useState, useEffect } from 'preact/hooks';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import MailIcon from '@mui/icons-material/Mail';
import DraftsIcon from '@mui/icons-material/Drafts';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Toolbar from '@mui/material/Toolbar';
import MessageViewer from './MessageViewer';
import ComposeEmail from './ComposeEmail';
import { fetchMessages, fetchMessage, deleteMessage, markAsRead, markAsUnread, MessageMetadata } from '../data/messages';

interface MessageListProps {
    mailbox: string;
    accountId: string;
}

export default function MessageList({ mailbox, accountId }: MessageListProps) {
    const [messages, setMessages] = useState<MessageMetadata[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<{ uid: number; id?: string } | null>(
        null
    );
    const [viewerOpen, setViewerOpen] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [draftMessage, setDraftMessage] = useState<any | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    useEffect(() => {
        loadMessages();
    }, [mailbox]);

    const handleMessageClick = async (message: MessageMetadata) => {
        // Find the message in the list
        if (mailbox.toLowerCase() === 'drafts') {
            // Fetch full message details for draft
            try {
                if (!message.id) {
                    setError('Invalid message: missing email ID');
                    return;
                }
                const data = await fetchMessage(accountId, message.id, message.uid);
                setDraftMessage(data);
                setComposeOpen(true);
            } catch (err) {
                setError('Failed to load draft for editing');
            }
        } else {
            setSelectedMessage({ uid: message.uid, id: message.id });
            setViewerOpen(true);
            
            // Mark as read if it's unread
            if (message.id && isUnread(message.flags)) {
                try {
                    await markAsRead(accountId, message.id);
                    // Update local state
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === message.id
                                ? { ...m, flags: [...m.flags.filter(f => f !== 'Unseen'), 'Seen'] }
                                : m
                        )
                    );
                } catch (err) {
                    console.error('Failed to mark as read:', err);
                }
            }
        }
    };

    const handleViewerClose = () => {
        setViewerOpen(false);
        loadMessages();
    };

    const handleDeleteClick = (message: MessageMetadata, event: Event) => {
        event.stopPropagation();
        if (!message.id) {
            setError('Invalid message: missing email ID');
            return;
        }
        setMessageToDelete(message.id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!messageToDelete) return;
        try {
            await deleteMessage(accountId, messageToDelete);
            await loadMessages();
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

    const handleCheckboxChange = (messageId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(messageId)) {
            newSelected.delete(messageId);
        } else {
            newSelected.add(messageId);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === messages.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(messages.map((m) => m.id).filter((id): id is string => !!id));
            setSelectedIds(allIds);
        }
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.size > 0) {
            setBulkDeleteDialogOpen(true);
        }
    };

    const handleBulkDeleteConfirm = async () => {
        try {
            await Promise.all(Array.from(selectedIds).map((id) => deleteMessage(accountId, id)));
            setSelectedIds(new Set());
            await loadMessages();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete messages');
        } finally {
            setBulkDeleteDialogOpen(false);
        }
    };

    const handleBulkDeleteCancel = () => {
        setBulkDeleteDialogOpen(false);
    };

    const handleMarkAsRead = async () => {
        if (selectedIds.size === 0) return;
        try {
            const ids = Array.from(selectedIds);
            await markAsRead(accountId, ids);
            setSelectedIds(new Set());
            await loadMessages();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
        }
    };

    const handleMarkAsUnread = async () => {
        if (selectedIds.size === 0) return;
        try {
            const ids = Array.from(selectedIds);
            await markAsUnread(accountId, ids);
            setSelectedIds(new Set());
            await loadMessages();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark messages as unread');
        }
    };

    const loadMessages = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMessages(accountId, mailbox);
            setMessages(data.messages);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const isUnread = (flags: string[]) => {
        return !flags.some((flag) => flag === 'Seen');
    };

    const isFlagged = (flags: string[]) => {
        return flags.some((flag) => flag === 'Flagged');
    };

    const isDraft = (flags: string[]) => {
        return flags.some((flag) => flag === 'Draft');
    };

    const now = new Date();
    const formatDate = (date: Date | null) => {
        if (!date) return '';
        try {
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
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
                <Box padding={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6">{mailbox}</Typography>
                        <Chip label={`${total} messages`} size="small" />
                    </Stack>
                </Box>
                <Divider />
                {selectedIds.size > 0 && (
                    <>
                        <Toolbar sx={{ bgcolor: 'action.selected' }}>
                            <Checkbox
                                checked={selectedIds.size === messages.length}
                                indeterminate={
                                    selectedIds.size > 0 && selectedIds.size < messages.length
                                }
                                onChange={handleSelectAll}
                            />
                            <Typography sx={{ flex: '1 1 100%' }} variant="subtitle1">
                                {selectedIds.size} selected
                            </Typography>
                            <IconButton onClick={handleMarkAsRead} title="Mark as read">
                                <MarkEmailReadIcon />
                            </IconButton>
                            <IconButton onClick={handleMarkAsUnread} title="Mark as unread">
                                <MarkEmailUnreadIcon />
                            </IconButton>
                            <IconButton onClick={handleBulkDeleteClick} color="error" title="Delete">
                                <DeleteIcon />
                            </IconButton>
                        </Toolbar>
                        <Divider />
                    </>
                )}
            </Paper>
            <List style={{ flexGrow: 1, overflow: 'auto' }}>
                {messages.map((message) => {
                    const displayName = message.from_name || message.from_email || 'Unknown Sender';
                    const formattedDate = formatDate(message.date);
                    const unread = isUnread(message.flags);
                    const flagged = isFlagged(message.flags);
                    const draft = isDraft(message.flags);

                    return (
                        <ListItem
                            key={message.uid}
                            disablePadding
                            divider
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={(e) => handleDeleteClick(message, e)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <Checkbox
                                checked={message.id ? selectedIds.has(message.id) : false}
                                onChange={() => message.id && handleCheckboxChange(message.id)}
                                disabled={!message.id}
                            />
                            <ListItemButton
                                selected={selectedMessage?.uid === message.uid}
                                onClick={() => handleMessageClick(message)}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" width="100%">
                                    {unread ? <MailIcon color="primary" /> : <DraftsIcon />}
                                    {flagged && <StarIcon color="warning" />}
                                    <ListItemText
                                        primary={displayName}
                                        secondary={message.subject || '(No subject)'}
                                        primaryTypographyProps={{
                                            fontWeight: unread ? 'bold' : 'normal',
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {formattedDate}
                                    </Typography>
                                </Stack>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Message Viewer Dialog */}
            {selectedMessage && (
                <MessageViewer
                    open={viewerOpen}
                    onClose={handleViewerClose}
                    onDelete={loadMessages}
                    mailbox={mailbox}
                    uid={selectedMessage.uid}
                    emailId={selectedMessage.id}
                    accountId={accountId}
                />
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
                    to={draftMessage.to || ''}
                    cc={draftMessage.cc || ''}
                    bcc={draftMessage.bcc || ''}
                    subject={draftMessage.subject || ''}
                    body={draftMessage.body || ''}
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
                        Are you sure you want to delete {selectedIds.size} message(s)?
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
