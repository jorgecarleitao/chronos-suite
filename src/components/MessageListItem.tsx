import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import MailIcon from '@mui/icons-material/Mail';
import DraftsIcon from '@mui/icons-material/Drafts';
import StarIcon from '@mui/icons-material/Star';
import DeleteIcon from '@mui/icons-material/Delete';
import { MessageMetadata } from '../data/messages';

interface MessageListItemProps {
    message: MessageMetadata;
    isSelected: boolean;
    isChecked: boolean;
    onSelect: (message: MessageMetadata) => void;
    onCheckboxChange: (messageId: string) => void;
    onDelete: (message: MessageMetadata, event: Event) => void;
    formatDate: (date: Date | null) => string;
    isUnread: (flags: string[]) => boolean;
    isFlagged: (flags: string[]) => boolean;
}

export default function MessageListItem({
    message,
    isSelected,
    isChecked,
    onSelect,
    onCheckboxChange,
    onDelete,
    formatDate,
    isUnread,
    isFlagged,
}: MessageListItemProps) {
    const displayName = message.from_name || message.from_email || 'Unknown Sender';
    const formattedDate = formatDate(message.date);
    const unread = isUnread(message.flags);
    const flagged = isFlagged(message.flags);

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
                <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => onDelete(message, e)}
                >
                    <DeleteIcon />
                </IconButton>
            }
        >
            <Checkbox
                checked={isChecked}
                onChange={() => onCheckboxChange(message.id)}
            />
            <ListItemButton selected={isSelected} onClick={() => onSelect(message)}>
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
}
