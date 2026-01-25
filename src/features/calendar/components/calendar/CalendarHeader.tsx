import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { getWeekDisplayText } from '../../../../utils/dateHelpers';

interface CalendarHeaderProps {
    view: 'month' | 'week';
    currentDate: Date;
    onViewChange: (view: 'month' | 'week') => void;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
}

export default function CalendarHeader({
    view,
    currentDate,
    onViewChange,
    onPrevious,
    onNext,
    onToday,
}: CalendarHeaderProps) {
    const { t, i18n } = useTranslation();

    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={2} alignItems="center">
                <IconButton onClick={onPrevious}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h5">
                    {view === 'month'
                        ? currentDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
                        : getWeekDisplayText(currentDate, i18n.language)}
                </Typography>
                <IconButton onClick={onNext}>
                    <ChevronRightIcon />
                </IconButton>
            </Stack>
            <Stack direction="row" spacing={2}>
                <ButtonGroup variant="outlined" size="small">
                    <Button
                        onClick={() => onViewChange('week')}
                        variant={view === 'week' ? 'contained' : 'outlined'}
                    >
                        {t('calendar.week')}
                    </Button>
                    <Button
                        onClick={() => onViewChange('month')}
                        variant={view === 'month' ? 'contained' : 'outlined'}
                    >
                        {t('calendar.month')}
                    </Button>
                </ButtonGroup>
                <Button variant="outlined" startIcon={<TodayIcon />} onClick={onToday}>
                    {t('calendar.today')}
                </Button>
            </Stack>
        </Stack>
    );
}
