import { useTranslation } from 'react-i18next';
import Typography from '@mui/material/Typography';

interface MessageHeaderProps {
    subject: string;
}

export default function MessageHeader({ subject }: MessageHeaderProps) {
    const { t } = useTranslation();
    return (
        <Typography variant="h5" gutterBottom>
            {subject || t('messageHeader.noSubject')}
        </Typography>
    );
}
