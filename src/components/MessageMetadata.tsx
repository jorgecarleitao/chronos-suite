import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

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
    const toDisplay = toName ? `${toName} <${toEmail}>` : toEmail;

    return (
        <>
            <Stack spacing={1} mb={2}>
                <Stack direction="row" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        From:
                    </Typography>
                    <Typography variant="body2">
                        {fromName} &lt;{fromEmail}&gt;
                    </Typography>
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
