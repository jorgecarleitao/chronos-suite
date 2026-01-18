import { useState, useEffect } from 'preact/hooks';
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
import { MessageMetadata } from '../../../data/messages';
import { fetchContacts, Contact } from '../../../data/contacts';
import { getPrimaryAccountId } from '../../../data/accounts';

interface MessageListItemProps {
    message: MessageMetadata;
    isSelected: boolean;
    isChecked: boolean;
    onSelect: (message: MessageMetadata) => void;
    onCheckboxChange: (messageId: string) => void;
    onDelete: (message: MessageMetadata, event: Event) => void;
    onToggleStar: (messageId: string, isFlagged: boolean, event: Event) => void;
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
    onToggleStar,
    formatDate,
    isUnread,
    isFlagged,
}: MessageListItemProps) {
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContact();
    }, [message.from_email]);

    const loadContact = async () => {
        if (!message.from_email) {
            setLoading(false);
            return;
        }
        try {
            const accountId = await getPrimaryAccountId();
            const contacts = await fetchContacts(accountId);
            const matchingContact = contacts.find(c => c.email?.toLowerCase() === message.from_email?.toLowerCase());
            setContact(matchingContact || null);
        } catch (err) {
            console.error('Failed to load contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const displayName = message.from_name || message.from_email || 'Unknown Sender';
    const formattedDate = formatDate(message.date);
    const unread = isUnread(message.flags);
    const flagged = isFlagged(message.flags);

    const renderFromField = () => {
        if (loading || !contact) {
            return displayName;
        }

        const contactInfo = [
            contact.company && `Company: ${contact.company}`,
            contact.jobTitle && `Title: ${contact.jobTitle}`,
            contact.email && `Email: ${contact.email}`,
        ].filter(Boolean).join('\n');

        return (
            <Tooltip 
                title={
                    <Box sx={{ whiteSpace: 'pre-line' }}>
                        {contactInfo || 'Contact in address book'}
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
    };

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
                        aria-label="star"
                        onClick={(e) => onToggleStar(message.id, flagged, e)}
                        size="small"
                    >
                        {flagged ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                        edge="end"
                        aria-label="delete"
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
                        primary={renderFromField()}
                        secondary={message.subject || '(No subject)'}
                        primaryTypographyProps={{
                            fontWeight: unread ? 'bold' : 'normal',
                        }}
                        sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {formattedDate}
                    </Typography>
                </Stack>
            </ListItemButton>
        </ListItem>
    );
}
