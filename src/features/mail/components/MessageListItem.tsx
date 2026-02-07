import { useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import MailIcon from '@mui/icons-material/Mail';
import DraftsIcon from '@mui/icons-material/Drafts';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { type MessageMetadata } from '../data/message';
import { type ContactInfo } from '../../../data/contactService';

interface MessageListItemProps {
    message: MessageMetadata;
    contact?: ContactInfo;
    isSelected: boolean;
    isChecked: boolean;
    onSelect: (message: MessageMetadata) => void;
    onCheckboxChange: (messageId: string) => void;
    onDelete: (message: MessageMetadata, event: Event) => void;
    onToggleStar: (messageId: string, isFlagged: boolean, event: Event) => void;
    translations: {
        unknownSender: string;
        noSubject: string;
        toggleStar: string;
        delete: string;
        attachments: string;
        company: string;
        title: string;
        email: string;
        contactInAddressBook: string;
    };
}

const isUnread = (flags: string[]) => !flags.some((flag) => flag === 'seen');
const isFlagged = (flags: string[]) => flags.some((flag) => flag === 'flagged');

const formatDate = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    try {
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

function MessageListItem({
    message,
    contact,
    isSelected,
    isChecked,
    onSelect,
    onCheckboxChange,
    onDelete,
    onToggleStar,
    translations,
}: MessageListItemProps) {
    const displayName = message.from_name || message.from_email || translations.unknownSender;
    const formattedDate = formatDate(message.date);
    const unread = isUnread(message.flags);
    const flagged = isFlagged(message.flags);

    const renderFromField = useMemo(() => {
        if (!contact) {
            return displayName;
        }

        const contactInfo = [
            contact.company && `${translations.company}: ${contact.company}`,
            contact.jobTitle && `${translations.title}: ${contact.jobTitle}`,
            contact.email && `${translations.email}: ${contact.email}`,
        ]
            .filter(Boolean)
            .join('\n');

        return (
            <Tooltip
                title={
                    <Box sx={{ whiteSpace: 'pre-line' }}>
                        {contactInfo || translations.contactInAddressBook}
                    </Box>
                }
                arrow
            >
                <Chip
                    icon={<PersonIcon />}
                    label={displayName}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        maxWidth: '100%',
                        height: 24,
                    }}
                />
            </Tooltip>
        );
    }, [contact, displayName, translations]);

    return (
        <ListItem
            key={message.id}
            disablePadding
            divider
            draggable={!!message.id}
            sx={{
                bgcolor: isChecked ? 'action.selected' : 'transparent',
            }}
            onDragStart={(e) => {
                if (message.id) {
                    e.dataTransfer!.setData('messageIds', JSON.stringify([message.id]));
                    e.dataTransfer!.effectAllowed = 'move';
                }
            }}
            secondaryAction={
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        edge="end"
                        aria-label={translations.toggleStar}
                        onClick={(e) => onToggleStar(message.id, flagged, e)}
                        size="small"
                    >
                        {flagged ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                        edge="end"
                        aria-label={translations.delete}
                        onClick={(e) => onDelete(message, e)}
                        size="small"
                    >
                        <DeleteIcon />
                    </IconButton>
                </Stack>
            }
        >
            <Checkbox checked={isChecked} onChange={() => onCheckboxChange(message.id)} />
            <ListItemButton selected={isSelected} onClick={() => onSelect(message)}>
                <Stack direction="row" spacing={1} alignItems="center" width="100%" sx={{ pr: 10 }}>
                    {unread ? <MailIcon color="primary" /> : <DraftsIcon />}
                    <ListItemText
                        primary={renderFromField}
                        secondary={message.subject || translations.noSubject}
                        primaryTypographyProps={{
                            fontWeight: unread ? 'bold' : 'normal',
                        }}
                        sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                        {message.hasAttachment && (
                            <Tooltip title={translations.attachments}>
                                <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            </Tooltip>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {formattedDate}
                        </Typography>
                    </Stack>
                </Stack>
            </ListItemButton>
        </ListItem>
    );
}

export default memo(MessageListItem);
