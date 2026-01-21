import { useState, useEffect, useRef } from 'preact/hooks';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';

import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { createDraft, updateDraft, prepareAndSendMessage } from '../data/messages';
import { jmapService, Attachment } from '../../../data/jmapClient';
import AttachmentsSection from './AttachmentsSection';

const composerWidth = 600;
const composerHeight = 600;
const AUTO_SAVE_DELAY = 3000; // 3 seconds

// Utility functions
const parseEmailList = (emails: string): string[] => {
    return emails
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
};

const uploadImageAsBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Types
interface DraftData {
    to: string[];
    subject: string;
    body: string;
    cc: string[];
    bcc: string[];
    attachments?: Attachment[];
}

export interface DraftMessage {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
}

type AutoSaveStatus = 'idle' | 'saving' | 'saved';

interface ComposeEmailProps {
    open: boolean;
    onClose: () => void;
    mailbox?: string;
    fromName?: string;
    fromEmail?: string;
    message?: DraftMessage;
    draftEmailId?: string;
    accountId: string;
}

// Header Component
interface ComposerHeaderProps {
    autoSaveStatus: AutoSaveStatus;
    minimized: boolean;
    onMinimize: () => void;
    onClose: () => void;
    onExpandClick: () => void;
}

function ComposerHeader({
    autoSaveStatus,
    minimized,
    onMinimize,
    onClose,
    onExpandClick,
}: ComposerHeaderProps) {
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 2,
                py: 1,
                cursor: minimized ? 'pointer' : 'default',
            }}
            onClick={onExpandClick}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" fontWeight="medium">
                    New Message
                </Typography>
                {autoSaveStatus === 'saving' && (
                    <Chip
                        size="small"
                        label="Saving..."
                        icon={<CircularProgress size={12} sx={{ color: 'inherit' }} />}
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'inherit',
                        }}
                    />
                )}
                {autoSaveStatus === 'saved' && (
                    <Chip
                        size="small"
                        label="Saved"
                        icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'inherit',
                        }}
                    />
                )}
            </Stack>
            <Stack direction="row" spacing={0.5}>
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        onMinimize();
                    }}
                    size="small"
                    sx={{ color: 'inherit' }}
                >
                    {minimized ? (
                        <MaximizeIcon fontSize="small" />
                    ) : (
                        <MinimizeIcon fontSize="small" />
                    )}
                </IconButton>
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    size="small"
                    sx={{ color: 'inherit' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Stack>
    );
}

// Email Fields Component
interface EmailFieldsProps {
    fromName?: string;
    fromEmail?: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    showCc: boolean;
    showBcc: boolean;
    onToChange: (value: string) => void;
    onCcChange: (value: string) => void;
    onBccChange: (value: string) => void;
    onSubjectChange: (value: string) => void;
    onToggleCc: () => void;
    onToggleBcc: () => void;
}

function EmailFields({
    fromName,
    fromEmail,
    to,
    cc,
    bcc,
    subject,
    showCc,
    showBcc,
    onToChange,
    onCcChange,
    onBccChange,
    onSubjectChange,
    onToggleCc,
    onToggleBcc,
}: EmailFieldsProps) {
    return (
        <>
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
                onChange={(e) => onToChange((e.target as HTMLInputElement).value)}
                required
                helperText="Separate multiple addresses with commas or semicolons"
            />

            <Stack direction="row" spacing={1}>
                <Button size="small" onClick={onToggleCc}>
                    {showCc ? 'Remove Cc' : 'Add Cc'}
                </Button>
                <Button size="small" onClick={onToggleBcc}>
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
                    onChange={(e) => onCcChange((e.target as HTMLInputElement).value)}
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
                    onChange={(e) => onBccChange((e.target as HTMLInputElement).value)}
                    helperText="Separate multiple addresses with commas or semicolons"
                />
            )}

            <TextField
                label="Subject"
                variant="outlined"
                size="small"
                fullWidth
                value={subject}
                onChange={(e) => onSubjectChange((e.target as HTMLInputElement).value)}
                required
            />
        </>
    );
}

// Body Editor Component
interface BodyEditorProps {
    body: string;
    onBodyChange: (value: string) => void;
    onImageUpload: (file: File) => Promise<void>;
}

function BodyEditor({ body, onBodyChange, onImageUpload }: BodyEditorProps) {
    const handlePaste = async (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await onImageUpload(file);
                }
            }
        }
    };

    const handleEditorChange = (val: string | undefined) => {
        const newValue = val || '';
        onBodyChange(newValue);
    };

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" marginBottom={1}>
                Body (Markdown supported - paste images directly)
            </Typography>
            <div data-color-mode="light" onPaste={handlePaste}>
                <MDEditor
                    value={body}
                    onChange={handleEditorChange}
                    height={300}
                    previewOptions={{
                        rehypePlugins: [[rehypeSanitize]],
                    }}
                />
            </div>
        </Box>
    );
}

// Actions Bar Component
interface ActionsBarProps {
    saving: boolean;
    onSend: () => void;
    onSaveDraft: () => void;
    onClear: () => void;
}

function ActionsBar({ saving, onSend, onSaveDraft, onClear }: ActionsBarProps) {
    return (
        <>
            <Divider />
            <Stack direction="row" spacing={1}>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <SendIcon />}
                    onClick={onSend}
                    disabled={saving}
                    fullWidth
                    color="primary"
                >
                    Send
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={onSaveDraft}
                    disabled={saving}
                >
                    Save Draft
                </Button>
                <Button variant="outlined" onClick={onClear} disabled={saving}>
                    Clear
                </Button>
            </Stack>
        </>
    );
}

// Main Component
export default function ComposeEmail({
    open,
    onClose,
    mailbox = 'Drafts',
    fromName = '',
    fromEmail = '',
    message,
    draftEmailId,
    accountId,
}: ComposeEmailProps) {
    const [to, setTo] = useState(message?.to || '');
    const [cc, setCc] = useState(message?.cc || '');
    const [bcc, setBcc] = useState(message?.bcc || '');
    const [subject, setSubject] = useState(message?.subject || '');
    const [body, setBody] = useState(message?.body || '');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showCc, setShowCc] = useState(!!message?.cc);
    const [showBcc, setShowBcc] = useState(!!message?.bcc);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [minimized, setMinimized] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftEmailId);
    const currentDraftIdRef = useRef<string | undefined>(draftEmailId);
    const autoSaveTimerRef = useRef<number | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Keep the ref in sync with state
    useEffect(() => {
        currentDraftIdRef.current = currentDraftId;
    }, [currentDraftId]);

    // Update fields when message prop changes
    useEffect(() => {
        if (message) {
            setTo(message.to || '');
            setCc(message.cc || '');
            setBcc(message.bcc || '');
            setSubject(message.subject || '');
            setBody(message.body || '');
            setShowCc(!!message.cc);
            setShowBcc(!!message.bcc);
        }
    }, [message]);

    // Create draft data object
    const createDraftData = (): DraftData => ({
        to: parseEmailList(to),
        subject,
        body,
        cc: showCc ? parseEmailList(cc) : [],
        bcc: showBcc ? parseEmailList(bcc) : [],
        attachments: attachments.length > 0 ? attachments : undefined,
    });

    const handleSend = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await prepareAndSendMessage(accountId, parseEmailList(to), subject, body, {
                cc: showCc && cc ? parseEmailList(cc) : undefined,
                bcc: showBcc && bcc ? parseEmailList(bcc) : undefined,
                attachments: attachments.length > 0 ? attachments : undefined,
            });
            setSuccess('Email sent successfully');
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
            const draftData = createDraftData();
            const existingDraftId = currentDraftIdRef.current;

            if (existingDraftId) {
                await updateDraft(accountId, existingDraftId, draftData);
            } else {
                const result = await createDraft(accountId, draftData);
                const newDraftId = result?.id;
                setCurrentDraftId(newDraftId);
                currentDraftIdRef.current = newDraftId;
            }

            setSuccess('Draft saved successfully');
            lastSavedContentRef.current = JSON.stringify(draftData);
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

    const autoSaveDraft = async () => {
        // Don't auto-save if nothing is entered yet
        if (!to && !subject && !body && !cc && !bcc) {
            setAutoSaveStatus('idle');
            return;
        }

        setAutoSaveStatus('saving');
        try {
            const draftData = createDraftData();
            const currentContent = JSON.stringify(draftData);

            // Don't save if content hasn't changed
            if (currentContent === lastSavedContentRef.current) {
                setAutoSaveStatus('saved');
                return;
            }

            // Use ref to get the latest draft ID value
            const existingDraftId = currentDraftIdRef.current;

            if (existingDraftId) {
                await updateDraft(accountId, existingDraftId, draftData);
            } else {
                const result = await createDraft(accountId, draftData);
                const newDraftId = result?.id;
                setCurrentDraftId(newDraftId);
                currentDraftIdRef.current = newDraftId;
            }

            lastSavedContentRef.current = currentContent;
            setAutoSaveStatus('saved');
        } catch (err) {
            console.error('Auto-save failed:', err);
            setAutoSaveStatus('idle');
        }
    };

    // Auto-save effect - triggers on content changes
    useEffect(() => {
        if (!open) return;

        // Clear any existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // Set status to idle when user is typing
        setAutoSaveStatus('idle');

        // Set a new timer for auto-save
        autoSaveTimerRef.current = window.setTimeout(() => {
            autoSaveDraft();
        }, AUTO_SAVE_DELAY);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [to, cc, bcc, subject, body, showCc, showBcc, attachments, open]);

    const handleClose = async () => {
        // Save draft before closing if there's content
        if (to || subject || body || cc || bcc || attachments.length > 0) {
            try {
                const draftData = createDraftData();
                const currentContent = JSON.stringify(draftData);

                // Only save if content has changed since last save
                if (currentContent !== lastSavedContentRef.current) {
                    const existingDraftId = currentDraftIdRef.current;

                    if (existingDraftId) {
                        await updateDraft(accountId, existingDraftId, draftData);
                    } else {
                        await createDraft(accountId, draftData);
                    }
                }
            } catch (err) {
                console.error('Failed to save draft on close:', err);
            }
        }

        onClose();
    };

    const handleClear = () => {
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
        setAttachments([]);
        setShowCc(false);
        setShowBcc(false);
        setError(null);
        setSuccess(null);
        setMinimized(false);
        setAutoSaveStatus('idle');
        setCurrentDraftId(undefined);
        currentDraftIdRef.current = undefined;
        lastSavedContentRef.current = '';
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            const base64 = await uploadImageAsBase64(file);
            const imageMarkdown = `![image](${base64})`;
            setBody((prev) => prev + '\n' + imageMarkdown);
        } catch (err) {
            setError('Failed to upload image');
        }
    };

    const handleFileAttach = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const newAttachments: Attachment[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const uploadResult = await jmapService.uploadBlob(accountId, file);

                newAttachments.push({
                    blobId: uploadResult.blobId,
                    name: file.name,
                    type: uploadResult.type,
                    size: uploadResult.size,
                });
            }

            setAttachments((prev) => [...prev, ...newAttachments]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload attachments');
        } finally {
            setUploading(false);
            // Reset input so the same file can be selected again
            if (input) {
                input.value = '';
            }
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    if (!open) return null;

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: composerWidth,
                maxHeight: minimized ? 'auto' : composerHeight,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1300,
                overflow: 'hidden',
            }}
        >
            <ComposerHeader
                autoSaveStatus={autoSaveStatus}
                minimized={minimized}
                onMinimize={() => setMinimized(!minimized)}
                onClose={handleClose}
                onExpandClick={() => minimized && setMinimized(false)}
            />

            <Collapse in={!minimized}>
                <Stack
                    padding={2}
                    spacing={2}
                    sx={{ maxHeight: composerHeight - 60, overflow: 'auto' }}
                >
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

                    <EmailFields
                        fromName={fromName}
                        fromEmail={fromEmail}
                        to={to}
                        cc={cc}
                        bcc={bcc}
                        subject={subject}
                        showCc={showCc}
                        showBcc={showBcc}
                        onToChange={setTo}
                        onCcChange={setCc}
                        onBccChange={setBcc}
                        onSubjectChange={setSubject}
                        onToggleCc={() => setShowCc(!showCc)}
                        onToggleBcc={() => setShowBcc(!showBcc)}
                    />

                    <BodyEditor
                        body={body}
                        onBodyChange={setBody}
                        onImageUpload={handleImageUpload}
                    />

                    <AttachmentsSection
                        attachments={attachments}
                        uploading={uploading}
                        saving={saving}
                        fileInputRef={fileInputRef}
                        onFileAttach={handleFileAttach}
                        onRemoveAttachment={handleRemoveAttachment}
                    />

                    <ActionsBar
                        saving={saving}
                        onSend={handleSend}
                        onSaveDraft={handleSaveDraft}
                        onClear={handleClear}
                    />
                </Stack>
            </Collapse>
        </Paper>
    );
}
