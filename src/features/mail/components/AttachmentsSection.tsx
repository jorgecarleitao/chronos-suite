import { RefObject } from 'preact';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import CircularProgress from '@mui/material/CircularProgress';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Attachment } from '../../../data/jmapClient';

interface AttachmentsSectionProps {
    attachments: Attachment[];
    uploading: boolean;
    saving: boolean;
    fileInputRef: RefObject<HTMLInputElement>;
    onFileAttach: (event: Event) => void;
    onRemoveAttachment: (index: number) => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function AttachmentsSection({
    attachments,
    uploading,
    saving,
    fileInputRef,
    onFileAttach,
    onRemoveAttachment,
}: AttachmentsSectionProps) {
    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={onFileAttach}
                />
                <Button
                    size="small"
                    startIcon={uploading ? <CircularProgress size={16} /> : <AttachFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? 'Uploading...' : 'Attach Files'}
                </Button>
                {attachments.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
                    </Typography>
                )}
            </Stack>

            {attachments.length > 0 && (
                <List
                    dense
                    sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                    }}
                >
                    {attachments.map((attachment, index) => (
                        <ListItem key={index}>
                            <AttachFileIcon
                                fontSize="small"
                                sx={{ mr: 1, color: 'text.secondary' }}
                            />
                            <ListItemText
                                primary={attachment.name}
                                secondary={formatFileSize(attachment.size)}
                            />
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => onRemoveAttachment(index)}
                                    disabled={uploading || saving}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
}
