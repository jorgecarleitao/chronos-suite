import { useState, useEffect } from 'preact/hooks';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import PersonIcon from '@mui/icons-material/Person';
import { fetchContacts, Contact } from '../data/contacts';
import { getPrimaryAccountId } from '../data/accounts';

interface MessageMetadataProps {
    fromName: string;
    fromEmail: string;
    toName?: string;
    toEmail: string;
    date: Date | null;
}

export default function MessageMetadata({
    fromName,
    fromEmail,
    toName,
    toEmail,
    date,
}: MessageMetadataProps) {
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContact();
    }, [fromEmail]);

    const loadContact = async () => {
        try {
            const accountId = await getPrimaryAccountId();
            const contacts = await fetchContacts(accountId);
            const matchingContact = contacts.find(c => c.email?.toLowerCase() === fromEmail.toLowerCase());
            setContact(matchingContact || null);
        } catch (err) {
            console.error('Failed to load contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const toDisplay = toName ? `${toName} <${toEmail}>` : toEmail;

    const renderFromField = () => {
        if (loading) {
            return (
                <Typography variant="body2">
                    {fromName} &lt;{fromEmail}&gt;
                </Typography>
            );
        }

        if (contact) {
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
                        label={`${fromName} <${fromEmail}>`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: 2, maxWidth: '100%' }}
                    />
                </Tooltip>
            );
        }

        return (
            <Typography variant="body2">
                {fromName} &lt;{fromEmail}&gt;
            </Typography>
        );
    };

    return (
        <>
            <Stack spacing={1} mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        From:
                    </Typography>
                    {renderFromField()}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        To:
                    </Typography>
                    <Typography variant="body2">{toDisplay}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        Date:
                    </Typography>
                    <Typography variant="body2">
                        {date ? date.toLocaleString() : 'Unknown'}
                    </Typography>
                </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
        </>
    );
}
