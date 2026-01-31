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
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import Markdown from 'preact-markdown';
import {
    createDraft,
    updateDraft,
    prepareAndSendMessage,
    deleteMessages,
    type Attachment,
    uploadBlob,
} from '../data/message';
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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Types
export interface DraftMessage {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
    attachments?: Attachment[];
}

type AutoSaveStatus = 'idle' | 'saving' | 'saved';

// Map to track inline images: clean marker (filename) -> attachment + preview data
interface InlineImage {
    file: File;
    dataUrl: string; // base64 data URL for preview rendering
    attachment: Attachment; // Already uploaded attachment
    marker: string; // Clean markdown marker like 'inline:image.png'
}

interface ComposeEmailProps {
    onClose: () => void;
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
    const { t } = useTranslation();
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            bgcolor="primary.main"
            color="primary.contrastText"
            px={2}
            py={1}
            onClick={onExpandClick}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" fontWeight="medium">
                    {t('compose.newMessage')}
                </Typography>
                {autoSaveStatus === 'saving' && (
                    <Chip
                        size="small"
                        label={t('compose.saving')}
                        icon={<CircularProgress size={12} color="inherit" />}
                    />
                )}
                {autoSaveStatus === 'saved' && (
                    <Chip
                        size="small"
                        label={t('compose.saved')}
                        icon={<CheckCircleIcon fontSize="small" />}
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
                    color="inherit"
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
                    color="inherit"
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
    const { t } = useTranslation();
    return (
        <Stack spacing={0} divider={<Divider />}>
            <Stack direction="row" alignItems="center" spacing={1} py={1} px={2}>
                <TextField
                    variant="standard"
                    size="small"
                    fullWidth
                    value={to}
                    onChange={(e) => onToChange((e.target as HTMLInputElement).value)}
                    placeholder={t('compose.recipients')}
                    InputProps={{ disableUnderline: true }}
                    autoComplete="off"
                />
                <Button size="small" onClick={onToggleCc}>
                    {t('compose.cc')}
                </Button>
                <Button size="small" onClick={onToggleBcc}>
                    {t('compose.bcc')}
                </Button>
            </Stack>

            {showCc && (
                <Stack direction="row" alignItems="center" spacing={1} py={1} px={2}>
                    <TextField
                        variant="standard"
                        size="small"
                        fullWidth
                        value={cc}
                        onChange={(e) => onCcChange((e.target as HTMLInputElement).value)}
                        placeholder={t('compose.cc')}
                        InputProps={{ disableUnderline: true }}
                        autoComplete="off"
                    />
                </Stack>
            )}

            {showBcc && (
                <Stack direction="row" alignItems="center" spacing={1} py={1} px={2}>
                    <TextField
                        variant="standard"
                        size="small"
                        fullWidth
                        value={bcc}
                        onChange={(e) => onBccChange((e.target as HTMLInputElement).value)}
                        placeholder={t('compose.bcc')}
                        InputProps={{ disableUnderline: true }}
                        autoComplete="off"
                    />
                </Stack>
            )}

            <Stack direction="row" alignItems="center" spacing={1} py={1} px={2}>
                <TextField
                    variant="standard"
                    size="small"
                    fullWidth
                    value={subject}
                    onChange={(e) => onSubjectChange((e.target as HTMLInputElement).value)}
                    placeholder={t('compose.subject')}
                    InputProps={{ disableUnderline: true }}
                    autoComplete="off"
                />
            </Stack>
        </Stack>
    );
}

// Body Editor Component
interface BodyEditorProps {
    body: string;
    onBodyChange: (value: string) => void;
    onImageUpload: (file: File) => Promise<void>;
    inlineImages: Map<string, InlineImage>;
}

function BodyEditor({ body, onBodyChange, onImageUpload, inlineImages }: BodyEditorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const theme = useTheme();
    const { t } = useTranslation();

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

    // Replace inline: markers with actual base64 for preview
    const getPreviewBody = () => {
        let previewBody = body;
        for (const [marker, imageData] of inlineImages.entries()) {
            // Replace ![name](inline:filename) with ![name](data:...)
            const markerRegex = new RegExp(`\\(${marker}\\)`, 'g');
            previewBody = previewBody.replace(markerRegex, `(${imageData.dataUrl})`);
        }
        return previewBody;
    };

    return (
        <Box flex={1} minHeight={0} display="flex" flexDirection="column" px={2} pt={2}>
            {/* Editor Tabs */}
            <Stack direction="row" spacing={1} mb={1}>
                <Button
                    size="small"
                    variant={!showPreview ? 'contained' : 'outlined'}
                    onClick={() => setShowPreview(false)}
                >
                    {t('compose.edit')}
                </Button>
                <Button
                    size="small"
                    variant={showPreview ? 'contained' : 'outlined'}
                    onClick={() => setShowPreview(true)}
                >
                    {t('compose.preview')}
                </Button>
            </Stack>

            {!showPreview ? (
                <TextField
                    value={body}
                    onChange={(e) => onBodyChange((e.target as HTMLTextAreaElement).value)}
                    onPaste={handlePaste}
                    placeholder={t('compose.writeMessageMarkdown')}
                    multiline
                    minRows={10}
                    maxRows={20}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                        sx: {
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            alignItems: 'flex-start',
                        },
                    }}
                    sx={{ flex: 1 }}
                />
            ) : (
                <Box
                    flex={1}
                    p={2}
                    border={1}
                    borderColor="divider"
                    borderRadius={1}
                    overflow="auto"
                    bgcolor="background.paper"
                    sx={{
                        '& img': {
                            maxWidth: '100%',
                            height: 'auto',
                        },
                        '& a': {
                            color: 'primary.main',
                        },
                        '& code': {
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'rgba(0,0,0,0.05)',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontFamily: 'monospace',
                        },
                        '& pre': {
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                            p: 1.5,
                            borderRadius: 0.5,
                            overflow: 'auto',
                        },
                        '& blockquote': {
                            borderLeft: 4,
                            borderColor: 'divider',
                            pl: 2,
                            ml: 0,
                            color: 'text.secondary',
                        },
                    }}
                >
                    {Markdown({ markdown: getPreviewBody() })}
                </Box>
            )}
        </Box>
    );
}

// Actions Bar Component
interface ActionsBarProps {
    saving: boolean;
    onSend: () => void;
    onAttach: () => void;
    onDelete: () => void;
}

function ActionsBar({ saving, onSend, onAttach, onDelete }: ActionsBarProps) {
    const { t } = useTranslation();
    return (
        <Stack direction="row" spacing={0.5} px={2} py={1.5} borderTop={1} borderColor="divider">
            <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={onSend}
                disabled={saving}
            >
                {t('compose.send')}
            </Button>

            <Box flex={1} />

            <IconButton
                size="small"
                onClick={onAttach}
                disabled={saving}
                title={t('compose.attachFiles')}
            >
                <AttachFileIcon fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                onClick={onDelete}
                disabled={saving}
                title={t('compose.deleteDraft')}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

// Main Component
export default function ComposeEmail({
    onClose,
    fromName = '',
    fromEmail = '',
    message,
    draftEmailId,
    accountId,
}: ComposeEmailProps) {
    const { t } = useTranslation();
    const [to, setTo] = useState(message?.to || '');
    const [cc, setCc] = useState(message?.cc || '');
    const [bcc, setBcc] = useState(message?.bcc || '');
    const [subject, setSubject] = useState(message?.subject || '');
    const [body, setBody] = useState(message?.body || '');
    const [attachments, setAttachments] = useState<Attachment[]>(message?.attachments || []);
    const [inlineImages, setInlineImages] = useState<Map<string, InlineImage>>(new Map());
    const [showCc, setShowCc] = useState(!!message?.cc);
    const [showBcc, setShowBcc] = useState(!!message?.bcc);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [minimized, setMinimized] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const currentDraftIdRef = useRef<string | undefined>(draftEmailId);
    const autoSaveTimerRef = useRef<number | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const autoSaveEnabledRef = useRef(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Helper to create draft data from current form state
    const createDraftData = () => ({
        to: parseEmailList(to),
        subject,
        body,
        cc: showCc ? parseEmailList(cc) : [],
        bcc: showBcc ? parseEmailList(bcc) : [],
        attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Helper to save draft with change detection
    const saveDraft = async () => {
        const draftData = createDraftData();
        const currentContent = JSON.stringify(draftData);

        // Don't save if content hasn't changed
        if (currentContent === lastSavedContentRef.current) {
            return false;
        }

        if (currentDraftIdRef.current) {
            await updateDraft(accountId, currentDraftIdRef.current, draftData);
        } else {
            const result = await createDraft(accountId, draftData);
            currentDraftIdRef.current = result?.id;
        }

        lastSavedContentRef.current = currentContent;
        return true;
    };

    const handleSend = async () => {
        autoSaveEnabledRef.current = false;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Process body to replace inline: markers with cid: references
            let processedBody = body;
            const inlineAttachments: Attachment[] = [];

            // Collect inline image attachments and replace inline: markers with cid:
            for (const [marker, imageData] of inlineImages.entries()) {
                // Use blobId as unique Content-ID
                const contentId = imageData.attachment.blobId;
                const inlineAttachment = {
                    ...imageData.attachment,
                    cid: contentId, // Set Content-ID for inline image
                };
                inlineAttachments.push(inlineAttachment);

                // Replace inline:blobId with cid:blobId
                const cidReference = `cid:${contentId}`;
                // Escape special regex characters in marker
                const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                processedBody = processedBody.replace(
                    new RegExp(`\\(${escapedMarker}\\)`, 'g'),
                    `(${cidReference})`
                );
            }

            // Combine inline attachments with regular attachments
            const allAttachments = [...attachments, ...inlineAttachments];

            const data = await prepareAndSendMessage(accountId, {
                to: parseEmailList(to),
                subject,
                body: processedBody,
                cc: showCc && cc ? parseEmailList(cc) : undefined,
                bcc: showBcc && bcc ? parseEmailList(bcc) : undefined,
                attachments: allAttachments.length > 0 ? allAttachments : undefined,
            });

            // Delete the draft if it exists since email was sent successfully
            const existingDraftId = currentDraftIdRef.current;
            if (existingDraftId) {
                try {
                    await deleteMessages(accountId, [existingDraftId]);
                    currentDraftIdRef.current = undefined;
                    lastSavedContentRef.current = '';
                } catch (err) {
                    console.error('Failed to delete draft after send:', err);
                }
            }

            setSuccess(t('compose.emailSentSuccessfully'));
            setTimeout(() => {
                handleClear();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('compose.failedToSendEmail'));
            autoSaveEnabledRef.current = true;
        } finally {
            setSaving(false);
        }
    };

    const autoSaveDraft = async () => {
        // Don't auto-save if disabled or if nothing is entered yet
        if (!autoSaveEnabledRef.current || (!to && !subject && !body && !cc && !bcc)) {
            setAutoSaveStatus('idle');
            return;
        }

        setAutoSaveStatus('saving');
        try {
            const saved = await saveDraft();
            setAutoSaveStatus('saved');
        } catch (err) {
            console.error('Auto-save failed:', err);
            setAutoSaveStatus('idle');
        }
    };

    // Auto-save effect - triggers on content changes
    useEffect(() => {
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
    }, [to, cc, bcc, subject, body, showCc, showBcc, attachments]);

    const handleClose = async () => {
        // Save draft on close if auto-save is still enabled
        if (
            autoSaveEnabledRef.current &&
            (to || subject || body || cc || bcc || attachments.length > 0)
        ) {
            try {
                await saveDraft();
            } catch (err) {
                console.error('Failed to save draft on close:', err);
            }
        }

        onClose();
    };

    const handleDelete = async () => {
        autoSaveEnabledRef.current = false;

        const existingDraftId = currentDraftIdRef.current;

        // Clear and close immediately
        handleClear();
        onClose();

        // Delete in background if draft exists
        if (existingDraftId) {
            try {
                await deleteMessages(accountId, [existingDraftId]);
            } catch (err) {
                console.error('Failed to delete draft:', err);
            }
        }
    };

    const handleClear = () => {
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
        setAttachments([]);
        setInlineImages(new Map());
        setShowCc(false);
        setShowBcc(false);
        setError(null);
        setSuccess(null);
        setMinimized(false);
        setAutoSaveStatus('idle');
        currentDraftIdRef.current = undefined;
        lastSavedContentRef.current = '';
        autoSaveEnabledRef.current = true;
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
    };

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            // Upload the image immediately to get blobId for sending later
            const uploadResult = await uploadBlob(accountId, file);
            const attachment: Attachment = {
                blobId: uploadResult.blobId,
                name: file.name,
                type: uploadResult.type,
                size: uploadResult.size,
            };

            // Convert to base64 data URL for preview rendering
            const dataUrl = await fileToBase64(file);

            // Create unique marker using blobId (e.g., "inline:Gf2e8b7a9c1d4e5f")
            const marker = `inline:${uploadResult.blobId}`;

            // Store the inline image data
            setInlineImages((prev) => {
                const updated = new Map(prev);
                updated.set(marker, { file, dataUrl, attachment, marker });
                return updated;
            });

            // Insert markdown with unique marker (will be replaced with cid: before sending)
            // Use filename in alt text for readability
            const imageMarkdown = `![${file.name}](${marker})`;
            setBody((prev) => prev + '\n' + imageMarkdown);
        } catch (err) {
            setError(t('compose.failedToUploadImage'));
        } finally {
            setUploading(false);
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
                const uploadResult = await uploadBlob(accountId, file);

                newAttachments.push({
                    blobId: uploadResult.blobId,
                    name: file.name,
                    type: uploadResult.type,
                    size: uploadResult.size,
                });
            }

            setAttachments((prev) => [...prev, ...newAttachments]);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('compose.failedToUploadAttachments'));
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

    const handleAttachClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            console.error('File input ref is null');
        }
    };

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: composerWidth,
                height: minimized ? 'auto' : composerHeight,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1300,
                overflow: 'hidden',
                borderRadius: 2,
            }}
        >
            <ComposerHeader
                autoSaveStatus={autoSaveStatus}
                minimized={minimized}
                onMinimize={() => setMinimized(!minimized)}
                onClose={handleClose}
                onExpandClick={() => minimized && setMinimized(false)}
            />

            <Collapse in={!minimized} timeout="auto" unmountOnExit>
                <Stack height={composerHeight - 48} display="flex" flexDirection="column">
                    {/* Success/Error messages */}
                    {(success || error) && (
                        <Box px={2} pt={1}>
                            {success && (
                                <Alert
                                    severity="success"
                                    onClose={() => setSuccess(null)}
                                    sx={{ mb: 1 }}
                                >
                                    {success}
                                </Alert>
                            )}
                            {error && (
                                <Alert
                                    severity="error"
                                    onClose={() => setError(null)}
                                    sx={{ mb: 1 }}
                                >
                                    {error}
                                </Alert>
                            )}
                        </Box>
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
                        inlineImages={inlineImages}
                    />

                    {/* Hidden file input - always rendered */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileAttach}
                        accept="*/*"
                    />

                    {attachments.length > 0 && (
                        <Box px={2} pb={1}>
                            <AttachmentsSection
                                attachments={attachments}
                                uploading={uploading}
                                saving={saving}
                                fileInputRef={fileInputRef}
                                onFileAttach={handleFileAttach}
                                onRemoveAttachment={handleRemoveAttachment}
                            />
                        </Box>
                    )}

                    <ActionsBar
                        saving={saving}
                        onSend={handleSend}
                        onAttach={handleAttachClick}
                        onDelete={handleDelete}
                    />
                </Stack>
            </Collapse>
        </Paper>
    );
}
