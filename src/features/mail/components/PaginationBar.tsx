import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface PaginationBarProps {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export default function PaginationBar({
    currentPage,
    totalPages,
    totalMessages,
    pageSize,
    onPageChange,
}: PaginationBarProps) {
    const { t } = useTranslation();
    const startMessage = (currentPage - 1) * pageSize + 1;
    const endMessage = Math.min(currentPage * pageSize, totalMessages);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            padding={2}
            spacing={2}
            sx={{
                backgroundColor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {t('pagination.showing', { start: startMessage, end: endMessage, total: totalMessages })}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                    size="small"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    title={t('pagination.previousPage')}
                >
                    <NavigateBeforeIcon />
                </IconButton>

                <Typography variant="body2">
                    {t('pagination.page', { current: currentPage, total: totalPages })}
                </Typography>

                <IconButton
                    size="small"
                    onClick={handleNext}
                    disabled={currentPage >= totalPages}
                    title={t('pagination.nextPage')}
                >
                    <NavigateNextIcon />
                </IconButton>
            </Stack>
        </Stack>
    );
}
