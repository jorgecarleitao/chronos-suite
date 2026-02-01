import { useTranslation } from 'react-i18next';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import PersonIcon from '@mui/icons-material/Person';
import { type ContactInfo } from '../../../data/contactService';

interface MessageMetadataProps {
    fromName: string;
    fromEmail: string;
    toName?: string;
    toEmail: string;
    date: Date | null;
    contact?: ContactInfo;
}

export default function MessageMetadata({
    fromName,
    fromEmail,
    toName,
    toEmail,
    date,
    contact,
}: MessageMetadataProps) {
    const { t } = useTranslation();

    const toDisplay = toName ? `${toName} <${toEmail}>` : toEmail;

    const renderFromField = () => {
        if (contact) {
            const contactInfo = [
                contact.company && `${t('contacts.company')}: ${contact.company}`,
                contact.jobTitle && `${t('contacts.title')}: ${contact.jobTitle}`,
                contact.email && `${t('contacts.email')}: ${contact.email}`,
            ]
                .filter(Boolean)
                .join('\n');

            return (
                <Tooltip
                    title={
                        <Box sx={{ whiteSpace: 'pre-line' }}>
                            {contactInfo || t('message.contactInAddressBook')}
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
                        {t('messageMetadata.from')}
                    </Typography>
                    {renderFromField()}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        {t('messageMetadata.to')}
                    </Typography>
                    <Typography variant="body2">{toDisplay}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        {t('messageMetadata.date')}
                    </Typography>
                    <Typography variant="body2">
                        {date ? date.toLocaleString() : t('messageMetadata.unknown')}
                    </Typography>
                </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
        </>
    );
}
