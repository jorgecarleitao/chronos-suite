import { useState, useEffect } from 'preact/hooks';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EventIcon from '@mui/icons-material/Event';
import { importCalendarInvite, checkEventExists } from '../../calendar/data/calendarEvents';
import { type Invite } from '../../../utils/calendarInviteParser';
import { useTranslation } from 'react-i18next';

interface CalendarInviteProps {
    invite: Invite;
    accountId: string;
    calendarId: string;
    currentStatus?: 'needs-action' | 'accepted' | 'declined' | 'tentative';
    onResponse?: (status: 'accepted' | 'declined' | 'tentative') => void;
}

export default function CalendarInvite({
    invite,
    accountId,
    calendarId,
    currentStatus = 'needs-action',
    onResponse,
}: CalendarInviteProps) {
    const { t } = useTranslation();
    const [responding, setResponding] = useState(false);
    const [responseStatus, setResponseStatus] = useState(currentStatus);
    const [error, setError] = useState<string | null>(null);
    const [alreadyExists, setAlreadyExists] = useState(false);
    const [checkingExists, setCheckingExists] = useState(true);

    // Check if event already exists on mount
    useEffect(() => {
        (async () => {
            try {
                const existing = await checkEventExists(accountId, calendarId, invite);
                setAlreadyExists(!!existing);
            } catch (err) {
                console.error('Failed to check existing event:', err);
            } finally {
                setCheckingExists(false);
            }
        })();
    }, [accountId, calendarId, invite]);

    const handleResponse = async (status: 'accepted' | 'declined' | 'tentative') => {
        setResponding(true);
        setError(null);

        try {
            await importCalendarInvite(accountId, calendarId, invite, status);
            setResponseStatus(status);
            if (onResponse) {
                onResponse(status);
            }
        } catch (err) {
            console.error('Failed to respond to invite:', err);
            setError(err instanceof Error ? err.message : t('calendarInvite.failedToRespond'));
        } finally {
            setResponding(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'success';
            case 'declined':
                return 'error';
            case 'tentative':
                return 'warning';
            default:
                return 'info';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'accepted':
                return t('calendarInvite.acceptedMessage');
            case 'declined':
                return t('calendarInvite.declinedMessage');
            case 'tentative':
                return t('calendarInvite.tentativeMessage');
            default:
                return t('calendarInvite.respondPrompt');
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                mb: 2,
                borderLeft: 3,
                borderColor: `${getStatusColor(responseStatus)}.main`,
            }}
        >
            <Stack spacing={1}>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        <EventIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" component="div" noWrap>
                            {invite.title}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                        <Button
                            variant={responseStatus === 'accepted' ? 'contained' : 'outlined'}
                            color="success"
                            size="small"
                            onClick={() => handleResponse('accepted')}
                            disabled={responding || alreadyExists || checkingExists}
                            sx={{ minWidth: 'auto', px: 1 }}
                            title={t('calendarInvite.accept')}
                        >
                            <CheckCircleIcon fontSize="small" />
                        </Button>
                        <Button
                            variant={responseStatus === 'tentative' ? 'contained' : 'outlined'}
                            color="warning"
                            size="small"
                            onClick={() => handleResponse('tentative')}
                            disabled={responding || alreadyExists || checkingExists}
                            sx={{ minWidth: 'auto', px: 1 }}
                            title={t('calendarInvite.tentative')}
                        >
                            <HelpOutlineIcon fontSize="small" />
                        </Button>
                        <Button
                            variant={responseStatus === 'declined' ? 'contained' : 'outlined'}
                            color="error"
                            size="small"
                            onClick={() => handleResponse('declined')}
                            disabled={responding || alreadyExists || checkingExists}
                            sx={{ minWidth: 'auto', px: 1 }}
                            title={t('calendarInvite.decline')}
                        >
                            <CancelIcon fontSize="small" />
                        </Button>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(invite.start)} • {formatTime(invite.start)} -{' '}
                        {formatTime(invite.end)}
                    </Typography>
                    {invite.location && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                            📍 {invite.location}
                        </Typography>
                    )}
                    {invite.organizer && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                            👤 {invite.organizer}
                        </Typography>
                    )}
                </Stack>

                {alreadyExists && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                            {t('calendarInvite.alreadyAdded')}
                        </Typography>
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                        <Typography variant="caption">{error}</Typography>
                    </Alert>
                )}

                {responseStatus !== 'needs-action' && !alreadyExists && (
                    <Typography
                        variant="caption"
                        color={`${getStatusColor(responseStatus)}.main`}
                        sx={{ fontWeight: 'medium' }}
                    >
                        {getStatusText(responseStatus)}
                    </Typography>
                )}
            </Stack>
        </Paper>
    );
}
