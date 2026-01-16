import { useState, useEffect } from 'preact/hooks';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplyIcon from '@mui/icons-material/Reply';
import ReplyAllIcon from '@mui/icons-material/ReplyAll';
import ForwardIcon from '@mui/icons-material/Forward';
import SendIcon from '@mui/icons-material/Send';
import Button from '@mui/material/Button';
import DOMPurify from 'dompurify';
import ComposeEmail from './ComposeEmail';
import {
    fetchMessage as apiFetchMessage,
    deleteMessage as apiDeleteMessage,
    sendMessage as apiSendMessage,
} from '../data/messages';

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
    flags: string[];
    size?: number;
    from?: string;
    to?: string;
    subject?: string;
    date?: string;
    message_id?: string;
    html_body?: string;
    text_body?: string;
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
    const [parsedBody, setParsedBody] = useState<{ html?: string; text?: string } | null>(null);
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

    const fetchMessage = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetchMessage(accountId, emailId);
            // Map to MessageDetail format
            const messageDetail: MessageDetail = {
                id: data.id,
                flags: [],
                from: data.from_email
                    ? `${data.from_name || ''} <${data.from_email}>`.trim()
                    : undefined,
                to: data.to_email ? `${data.to_name || ''} <${data.to_email}>`.trim() : undefined,
                subject: data.subject || undefined,
                date: data.date ? data.date.toISOString() : undefined,
                html_body: data.htmlBody,
                text_body: data.textBody,
            };
            setMessage(messageDetail);
            setParsedBody({
                html: messageDetail.html_body ? sanitizeHTML(messageDetail.html_body) : undefined,
                text: messageDetail.text_body,
            });
            
            // Notify parent to render actions
            if (renderActions) {
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

    const extractEmail = (emailStr?: string): string => {
        if (!emailStr) return '';
        const match = emailStr.match(/<(.+)>/);
        return match ? match[1] : emailStr;
    };

    const handleReply = () => {
        if (!message) return;
        const replyTo = extractEmail(message.from);
        const originalBody = parsedBody?.text || parsedBody?.html || '';
        const quotedBody = `\n\n---\nOn ${message.date || ''}, ${message.from || 'Unknown'} wrote:\n\n${originalBody}`;
        
        setComposeMode('reply');
        setComposeData({
            to: replyTo,
            subject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject || ''}`,
            body: quotedBody,
        });
        setComposeOpen(true);
    };

    const handleReplyAll = () => {
        if (!message) return;
        const replyTo = extractEmail(message.from);
        const originalTo = message.to?.split(',').map((e) => extractEmail(e.trim())).filter((e) => e) || [];
        const allRecipients = [replyTo, ...originalTo].filter((e, i, arr) => arr.indexOf(e) === i);
        
        const originalBody = parsedBody?.text || parsedBody?.html || '';
        const quotedBody = `\n\n---\nOn ${message.date || ''}, ${message.from || 'Unknown'} wrote:\n\n${originalBody}`;
        
        setComposeMode('replyAll');
        setComposeData({
            to: allRecipients.join(', '),
            subject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject || ''}`,
            body: quotedBody,
        });
        setComposeOpen(true);
    };

    const handleForward = () => {
        if (!message) return;
        const originalBody = parsedBody?.text || parsedBody?.html || '';
        const forwardedBody = `\n\n---\nForwarded message from ${message.from || 'Unknown'}:\nSubject: ${message.subject || '(No Subject)'}\nDate: ${message.date || ''}\n\n${originalBody}`;
        
        setComposeMode('forward');
        setComposeData({
            subject: message.subject?.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject || ''}`,
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
            const toList =
                message.to
                    ?.split(',')
                    .map((e) => e.trim())
                    .filter((e) => e.length > 0) || [];
            const data = await apiSendMessage(
                accountId,
                toList,
                message.subject || '',
                parsedBody?.text || parsedBody?.html || ''
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

    const sanitizeHTML = (html: string): string => {
        // Configure DOMPurify using blacklist approach - forbid dangerous elements
        return DOMPurify.sanitize(html, {
            FORBID_TAGS: [
                'script', 'iframe', 'object', 'embed', 'applet',
                'base', 'link', 'meta', 'noscript',
                'form', 'input', 'button', 'textarea', 'select', 'option',
                'frame', 'frameset',
            ],
            FORBID_ATTR: [
                'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
                'onmousemove', 'onmouseenter', 'onmouseleave', 'onchange',
                'onsubmit', 'onfocus', 'onblur', 'onkeydown', 'onkeyup',
                'onkeypress', 'ondblclick', 'oncontextmenu', 'oninput',
                'onpaste', 'oncopy', 'oncut', 'ondrag', 'ondrop',
                'formaction', 'action',
            ],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true,
            WHOLE_DOCUMENT: false,
        });
    };

    const renderMessageHeader = (message: MessageDetail) => (
        <Typography variant="h6">
            {message.subject || '(No Subject)'}
        </Typography>
    );

    const renderMessageMetadata = (message: MessageDetail) => (
        <Stack spacing={0.5}>
            <Typography variant="body2">
                <strong>From:</strong> {message.from || 'Unknown'}
            </Typography>
            <Typography variant="body2">
                <strong>To:</strong> {message.to || 'Unknown'}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                    {message.date ? new Date(message.date).toLocaleString() : 'Unknown'}
                </Typography>
                {message.flags && message.flags.length > 0 && (
                    <Stack direction="row" spacing={0.5}>
                        {message.flags.map((flag) => (
                            <Chip key={flag} label={flag} size="small" />
                        ))}
                    </Stack>
                )}
            </Stack>
        </Stack>
    );

    const renderMessageBody = (parsedBody: { html?: string; text?: string } | null) => {
        if (!parsedBody) {
            return <Typography>No message body</Typography>;
        }

        // Prefer HTML if available, otherwise show plain text
        if (parsedBody.html) {
            return <div dangerouslySetInnerHTML={{ __html: parsedBody.html }} />;
        }

        if (parsedBody.text) {
            return (
                <Typography component="pre" fontFamily="monospace" whiteSpace="pre-wrap">
                    {parsedBody.text}
                </Typography>
            );
        }

        return <Typography>Unable to parse message body</Typography>;
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
                    {/* Compact header section */}
                    <Paper elevation={0} square>
                        <Stack spacing={1.5} padding={2}>
                            {renderMessageHeader(message)}
                            {renderMessageMetadata(message)}
                        </Stack>
                        <Divider />
                    </Paper>

                    {/* Large body section */}
                    <Paper
                        elevation={0}
                        square
                        style={{ flex: 1, overflow: 'auto' }}
                    >
                        <Box padding={3}>{renderMessageBody(parsedBody)}</Box>
                    </Paper>
                </>
            )}

            {/* Delete Confirmation Dialog */}
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

            {/* Compose Email Dialog */}
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
