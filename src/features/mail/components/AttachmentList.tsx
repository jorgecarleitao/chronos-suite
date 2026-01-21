import { JSX } from 'preact';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import { jmapService } from '../../../data/jmapClient';

export interface Attachment {
    blobId: string;
    type: string;
    name?: string;
    size?: number;
}

interface AttachmentListProps {
    attachments: Attachment[];
    accountId: string;
}

/**
 * Format file size in a human-readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get the appropriate icon for a file type
 */
function getFileIcon(mimeType: string): JSX.Element {
    if (mimeType.includes('pdf')) {
        return <PictureAsPdfIcon />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return <DescriptionIcon />;
    } else if (mimeType.startsWith('image/')) {
        return <ImageIcon />;
    } else if (mimeType.startsWith('video/')) {
        return <VideoLibraryIcon />;
    } else if (mimeType.startsWith('audio/')) {
        return <AudioFileIcon />;
    } else if (
        mimeType.includes('zip') ||
        mimeType.includes('compress') ||
        mimeType.includes('archive')
    ) {
        return <FolderZipIcon />;
    }
    return <AttachFileIcon />;
}

/**
 * Check if file can be previewed in browser
 */
function canPreviewInBrowser(mimeType: string): boolean {
    return (
        mimeType.includes('pdf') ||
        mimeType.startsWith('image/') ||
        mimeType.startsWith('text/') ||
        mimeType.includes('html')
    );
}

/**
 * Download blob and create a download link
 */
async function downloadAttachment(
    accountId: string,
    blobId: string,
    fileName: string,
    mimeType: string
): Promise<void> {
    try {
        const response = await jmapService.downloadBlob(accountId, blobId, mimeType);
        const blob = await response.blob();

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download attachment:', error);
        alert('Failed to download attachment');
    }
}

/**
 * Open attachment in new tab (for PDFs, images, etc.)
 */
async function openAttachment(accountId: string, blobId: string, mimeType: string): Promise<void> {
    try {
        const response = await jmapService.downloadBlob(accountId, blobId, mimeType);
        const blob = await response.blob();

        // Create a URL for the blob and open in new tab
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');

        // Clean up the URL after a delay
        if (newWindow) {
            setTimeout(() => URL.revokeObjectURL(url), 60000); // Clean up after 1 minute
        } else {
            URL.revokeObjectURL(url);
            alert('Pop-up blocked. Please allow pop-ups to open attachments.');
        }
    } catch (error) {
        console.error('Failed to open attachment:', error);
        alert('Failed to open attachment');
    }
}

export default function AttachmentList({ attachments, accountId }: AttachmentListProps) {
    if (!attachments || attachments.length === 0) {
        return null;
    }

    // Filter out calendar invites (they're handled separately)
    const regularAttachments = attachments.filter(
        (att) => !att.type.includes('calendar') && !att.type.includes('ics')
    );

    if (regularAttachments.length === 0) {
        return null;
    }

    return (
        <Paper sx={{ mb: 2 }} elevation={1}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Attachments ({regularAttachments.length})
                </Typography>
            </Box>
            <List disablePadding>
                {regularAttachments.map((attachment, index) => {
                    const fileName = attachment.name || `attachment-${index + 1}`;
                    const fileSize = attachment.size
                        ? formatFileSize(attachment.size)
                        : 'Unknown size';
                    const canPreview = canPreviewInBrowser(attachment.type);

                    return (
                        <ListItem
                            key={attachment.blobId}
                            disablePadding
                            secondaryAction={
                                <Box>
                                    {canPreview && (
                                        <Tooltip title="Open in new tab">
                                            <IconButton
                                                edge="end"
                                                aria-label="open"
                                                onClick={() =>
                                                    openAttachment(
                                                        accountId,
                                                        attachment.blobId,
                                                        attachment.type
                                                    )
                                                }
                                                sx={{ mr: 1 }}
                                            >
                                                <OpenInNewIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Download">
                                        <IconButton
                                            edge="end"
                                            aria-label="download"
                                            onClick={() =>
                                                downloadAttachment(
                                                    accountId,
                                                    attachment.blobId,
                                                    fileName,
                                                    attachment.type
                                                )
                                            }
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            }
                        >
                            <ListItemButton
                                onClick={() => {
                                    if (canPreview) {
                                        openAttachment(
                                            accountId,
                                            attachment.blobId,
                                            attachment.type
                                        );
                                    } else {
                                        downloadAttachment(
                                            accountId,
                                            attachment.blobId,
                                            fileName,
                                            attachment.type
                                        );
                                    }
                                }}
                            >
                                <ListItemIcon>{getFileIcon(attachment.type)}</ListItemIcon>
                                <ListItemText
                                    primary={fileName}
                                    secondary={`${attachment.type} • ${fileSize}`}
                                    primaryTypographyProps={{
                                        noWrap: true,
                                        sx: { maxWidth: '400px' },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Paper>
    );
}
