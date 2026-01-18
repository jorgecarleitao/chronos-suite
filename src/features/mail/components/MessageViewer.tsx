import { useState, useEffect } from 'preact/hooks';
import { JSX } from 'preact';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ComposeEmail from './ComposeEmail';
import MessageHeader from './MessageHeader';
import MessageMetadata from './MessageMetadata';
import MessageBody from './MessageBody';
import {
    fetchMessage as apiFetchMessage,
    deleteMessage as apiDeleteMessage,
    sendMessage as apiSendMessage,
} from '../../../data/messages';

interface MessageViewerProps {
    onClose: () => void;
    onDelete?: () => void;
    mailbox: string;
    emailId: string;
    accountId: string;
    renderActions?: (handlers: {
        onReply: () => void;
        onReplyAll: () => void;
        onForward: () => void;
        onDelete: () => void;
        onSend: () => void;
        onClose: () => void;
        isDraft: boolean;
        sending: boolean;
    }) => JSX.Element;
}

interface MessageDetail {
    id: string;
    from_name: string;
    from_email: string;
    to_name?: string;
    to_email: string;
    to: string; // Comma-separated string for drafts
    cc?: string;
    bcc?: string;
    subject: string;
    date: Date | null;
    htmlBody?: string;
    textBody?: string;
    flags?: string[];
}

export default function MessageViewer({
    onClose,
    onDelete,
    mailbox,
    emailId,
    accountId,
    renderActions,
}: MessageViewerProps) {
    const [message, setMessage] = useState<MessageDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeMode, setComposeMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');
    const [composeData, setComposeData] = useState<{
        to?: string;
        cc?: string;
        subject?: string;
        body?: string;
    }>({});

    useEffect(() => {
        if (emailId) {
            fetchMessage();
        }
    }, [mailbox, emailId]);

    useEffect(() => {
        if (renderActions && message) {
            renderActions({
                onReply: handleReply,
                onReplyAll: handleReplyAll,
                onForward: handleForward,
                onDelete: handleDeleteClick,
                onSend: handleSendClick,
                onClose,
                isDraft: isDraft(),
                sending,
            });
        }
    }, [message, sending]);

    const fetchMessage = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetchMessage(accountId, emailId);
            setMessage(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch message');
        } finally {
            setLoading(false);
        }
    };

    const isDraft = () => {
        return message?.flags?.some((flag) => flag === 'Draft') || false;
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await apiDeleteMessage(accountId, emailId);
            setDeleteDialogOpen(false);
            onClose();
            if (onDelete) {
                onDelete();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete message');
            setDeleteDialogOpen(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
    };

    const handleReply = () => {
        if (!message) return;
        const originalBody = message.textBody || message.htmlBody || '';
        const quotedBody = `\n\n---\nOn ${message.date?.toLocaleString() || ''}, ${message.from_name} <${message.from_email}> wrote:\n\n${originalBody}`;

        setComposeMode('reply');
        setComposeData({
            to: message.from_email,
            subject: message.subject?.startsWith('Re:')
                ? message.subject
                : `Re: ${message.subject || ''}`,
            body: quotedBody,
        });
        setComposeOpen(true);
    };

    const handleReplyAll = () => {
        if (!message) return;
        const toEmails = message.to
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e);
        const allRecipients = [message.from_email, ...toEmails];
        const uniqueRecipients = Array.from(new Set(allRecipients));

        const originalBody = message.textBody || message.htmlBody || '';
        const quotedBody = `\n\n---\nOn ${message.date?.toLocaleString() || ''}, ${message.from_name} <${message.from_email}> wrote:\n\n${originalBody}`;

        setComposeMode('replyAll');
        setComposeData({
            to: uniqueRecipients.join(', '),
            subject: message.subject?.startsWith('Re:')
                ? message.subject
                : `Re: ${message.subject || ''}`,
            body: quotedBody,
        });
        setComposeOpen(true);
    };

    const handleForward = () => {
        if (!message) return;
        const originalBody = message.textBody || message.htmlBody || '';
        const forwardedBody = `\n\n---\nForwarded message from ${message.from_name} <${message.from_email}>:\nSubject: ${message.subject || '(No Subject)'}\nDate: ${message.date?.toLocaleString() || ''}\n\n${originalBody}`;

        setComposeMode('forward');
        setComposeData({
            subject: message.subject?.startsWith('Fwd:')
                ? message.subject
                : `Fwd: ${message.subject || ''}`,
            body: forwardedBody,
        });
        setComposeOpen(true);
    };

    const handleSendClick = async () => {
        if (!message) return;
        setSending(true);
        setError(null);
        setSendSuccess(null);
        try {
            const toList = message.to
                .split(',')
                .map((e) => e.trim())
                .filter((e) => e.length > 0);
            await apiSendMessage(
                accountId,
                toList,
                message.subject || '',
                message.textBody || message.htmlBody || ''
            );
            setSendSuccess('Email sent successfully');
            setTimeout(() => {
                onClose();
                if (onDelete) {
                    onDelete();
                }
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <Stack height="100%" spacing={0}>
            {loading && (
                <Stack justifyContent="center" alignItems="center" padding={3}>
                    <CircularProgress />
                </Stack>
            )}

            {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {sendSuccess && (
                <Alert severity="success" onClose={() => setSendSuccess(null)}>
                    {sendSuccess}
                </Alert>
            )}

            {message && !loading && (
                <>
                    <Paper elevation={0} square>
                        <Stack spacing={1.5} padding={2}>
                            <MessageHeader subject={message.subject} />
                            <MessageMetadata
                                fromName={message.from_name}
                                fromEmail={message.from_email}
                                toName={message.to_name}
                                toEmail={message.to_email}
                                date={message.date}
                            />
                        </Stack>
                        <Divider />
                    </Paper>

                    <Paper elevation={0} square style={{ flex: 1, overflow: 'auto' }}>
                        <Box padding={3}>
                            <MessageBody htmlBody={message.htmlBody} textBody={message.textBody} />
                        </Box>
                    </Paper>
                </>
            )}

            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Delete Message</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this message? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <ComposeEmail
                open={composeOpen}
                onClose={() => setComposeOpen(false)}
                to={composeData.to}
                cc={composeData.cc}
                subject={composeData.subject}
                body={composeData.body}
                accountId={accountId}
            />
        </Stack>
    );
}
