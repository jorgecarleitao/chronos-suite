import Typography from '@mui/material/Typography';

interface MessageHeaderProps {
    subject: string;
}

export default function MessageHeader({ subject }: MessageHeaderProps) {
    return (
        <Typography variant="h5" gutterBottom>
            {subject || '(No subject)'}
        </Typography>
    );
}
