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
import CalendarInvite from './CalendarInvite';
import AttachmentList from './AttachmentList';
import {
    findICSAttachment,
    parseICS,
    type Invite,
    type Attachment,
} from '../../../utils/calendarInviteParser';
import { jmapService } from '../../../data/jmapClient';
import {
    fetchMessage as apiFetchMessage,
    deleteMessage as apiDeleteMessage,
} from '../../../data/messages';
import { fetchCalendars } from '../../../data/calendarEvents';

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
    attachments?: any[];
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
    const [composeOpen, setComposeOpen] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [composeData, setComposeData] = useState<{
        to?: string;
        cc?: string;
        subject?: string;
        body?: string;
    }>({});
    const [parsedInvite, setParsedInvite] = useState<Invite | null>(null);
    const [calendarId, setCalendarId] = useState<string | null>(null);

    useEffect(() => {
        if (emailId) {
            fetchMessage();
        }
    }, [mailbox, emailId]);

    // Fetch default calendar
    useEffect(() => {
        (async () => {
            try {
                const calendars = await fetchCalendars(accountId);
                if (calendars.length > 0) {
                    setCalendarId(calendars[0].id);
                }
            } catch (err) {
                console.error('Failed to fetch calendars:', err);
            }
        })();
    }, [accountId]);

    // Download and parse ICS attachment when message loads
    useEffect(() => {
        if (!message || !message.attachments) return;

        const attachment = findICSAttachment(message.attachments as Attachment[]);
        if (!attachment) {
            setParsedInvite(null);
            return;
        }

        // Download and parse the ICS attachment
        (async () => {
            try {
                const response = await jmapService.downloadBlob(
                    accountId,
                    attachment.blobId,
                    attachment.type
                );
                const icsContent = await response.text();
                const parsed = parseICS(icsContent);
                setParsedInvite(parsed);
            } catch (err) {
                console.error('Failed to parse calendar invite:', err);
                setParsedInvite(null);
            }
        })();
    }, [message, accountId]);

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
                sending: false,
            });
        }
    }, [message]);

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

        setComposeData({
            subject: message.subject?.startsWith('Fwd:')
                ? message.subject
                : `Fwd: ${message.subject || ''}`,
            body: forwardedBody,
        });
        setComposeOpen(true);
    };

    const handleSendClick = () => {
        if (!message) return;
        // For drafts, open the compose editor to allow editing before sending
        setComposeData({
            to: message.to,
            cc: message.cc,
            subject: message.subject || '',
            body: message.textBody || '',
        });
        setComposeOpen(true);
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

            {success && (
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
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
                            {parsedInvite && calendarId && (
                                <CalendarInvite
                                    invite={parsedInvite}
                                    accountId={accountId}
                                    calendarId={calendarId}
                                    onResponse={(status) => {
                                        setSuccess(`Event ${status} and added to calendar`);
                                    }}
                                />
                            )}
                            <AttachmentList
                                attachments={message.attachments as Attachment[] || []}
                                accountId={accountId}
                            />
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
                draftEmailId={isDraft() ? emailId : undefined}
                accountId={accountId}
            />
        </Stack>
    );
}
