import { useState } from 'preact/hooks';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';

import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { marked } from 'marked';
import { sendMessage, createDraft, updateDraft } from '../data/messages';

const drawerWidth = 600;

interface ComposeEmailProps {
    open: boolean;
    onClose: () => void;
    mailbox?: string;
    fromName?: string;
    fromEmail?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
    draftEmailId?: string;
    accountId: string;
}

export default function ComposeEmail({
    open,
    onClose,
    mailbox = 'Drafts',
    fromName = '',
    fromEmail = '',
    to: initialTo = '',
    cc: initialCc = '',
    bcc: initialBcc = '',
    subject: initialSubject = '',
    body: initialBody = '',
    draftEmailId,
    accountId,
}: ComposeEmailProps) {
    const [to, setTo] = useState(initialTo);
    const [cc, setCc] = useState(initialCc);
    const [bcc, setBcc] = useState(initialBcc);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [showCc, setShowCc] = useState(!!initialCc);
    const [showBcc, setShowBcc] = useState(!!initialBcc);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const parseEmailList = (emails: string): string[] => {
        return emails
            .split(/[,;]/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
    };

    const handleSend = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            let htmlBody = marked.parse(body);
            if (htmlBody instanceof Promise) {
                htmlBody = await htmlBody;
            }
            const data = await sendMessage(accountId, parseEmailList(to), subject, htmlBody, {
                cc: showCc && cc ? parseEmailList(cc) : undefined,
                bcc: showBcc && bcc ? parseEmailList(bcc) : undefined,
                isHtml: true,
            });
            setSuccess(data?.message || 'Email sent successfully');
            setTimeout(() => {
                handleClear();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send email');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const draftData = {
                to: parseEmailList(to),
                subject,
                body,
                cc: showCc ? parseEmailList(cc) : [],
                bcc: showBcc ? parseEmailList(bcc) : [],
            };
            if (draftEmailId) {
                await updateDraft(accountId, draftEmailId, draftData);
            } else {
                await createDraft(accountId, draftData);
            }
            setSuccess('Draft saved successfully');
            setTimeout(() => {
                handleClear();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const handleClear = () => {
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
        setShowCc(false);
        setShowBcc(false);
        setError(null);
        setSuccess(null);
    };

    const handleImageUpload = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handlePaste = async (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    try {
                        const base64 = await handleImageUpload(file);
                        const imageMarkdown = `![image](${base64})`;
                        setBody((prev) => prev + '\n' + imageMarkdown);
                    } catch (err) {
                        setError('Failed to upload image');
                    }
                }
            }
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                style: { width: drawerWidth },
            }}
        >
            <Toolbar />
            <Stack padding={2} spacing={2} height="100%">
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">New Message</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>

                {/* Success/Error messages */}
                {success && (
                    <Alert severity="success" onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Form */}
                <Stack spacing={2} style={{ flex: 1, overflow: 'auto' }}>
                    {(fromName || fromEmail) && (
                        <TextField
                            label="From"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={fromName ? `${fromName} <${fromEmail}>` : fromEmail}
                            disabled
                            InputProps={{ readOnly: true }}
                        />
                    )}

                    <TextField
                        label="To"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={to}
                        onChange={(e) => setTo((e.target as HTMLInputElement).value)}
                        required
                        helperText="Separate multiple addresses with commas or semicolons"
                    />

                    <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setShowCc(!showCc)}>
                            {showCc ? 'Remove Cc' : 'Add Cc'}
                        </Button>
                        <Button size="small" onClick={() => setShowBcc(!showBcc)}>
                            {showBcc ? 'Remove Bcc' : 'Add Bcc'}
                        </Button>
                    </Stack>

                    {showCc && (
                        <TextField
                            label="Cc"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={cc}
                            onChange={(e) => setCc((e.target as HTMLInputElement).value)}
                            helperText="Separate multiple addresses with commas or semicolons"
                        />
                    )}

                    {showBcc && (
                        <TextField
                            label="Bcc"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={bcc}
                            onChange={(e) => setBcc((e.target as HTMLInputElement).value)}
                            helperText="Separate multiple addresses with commas or semicolons"
                        />
                    )}

                    <TextField
                        label="Subject"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={subject}
                        onChange={(e) => setSubject((e.target as HTMLInputElement).value)}
                        required
                    />

                    {/* Markdown Editor */}
                    <Box style={{ flex: 1, minHeight: '300px' }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            marginBottom={1}
                        >
                            Body (Markdown supported - paste images directly)
                        </Typography>
                        <div data-color-mode="light" onPaste={handlePaste}>
                            <MDEditor
                                value={body}
                                onChange={(val) => setBody(val || '')}
                                height={400}
                                previewOptions={{
                                    rehypePlugins: [[rehypeSanitize]],
                                }}
                            />
                        </div>
                    </Box>
                </Stack>

                {/* Actions */}
                <Divider />
                <Stack direction="row" spacing={1} paddingTop={2}>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <SendIcon />}
                        onClick={handleSend}
                        disabled={saving}
                        fullWidth
                        color="primary"
                    >
                        Send
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveDraft}
                        disabled={saving}
                    >
                        Save Draft
                    </Button>
                    <Button variant="outlined" onClick={handleClear} disabled={saving}>
                        Clear
                    </Button>
                </Stack>
            </Stack>
        </Drawer>
    );
}
