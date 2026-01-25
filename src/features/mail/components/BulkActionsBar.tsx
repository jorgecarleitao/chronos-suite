import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
    onMarkAsFlagged: () => void;
    onMarkAsUnflagged: () => void;
    onDelete: () => void;
    onRefresh: () => void;
}

export default function BulkActionsBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onMarkAsRead,
    onMarkAsUnread,
    onMarkAsFlagged,
    onMarkAsUnflagged,
    onDelete,
    onRefresh,
}: BulkActionsBarProps) {
    const { t } = useTranslation();
    const allSelected = selectedCount === totalCount && totalCount > 0;
    const someSelected = selectedCount > 0 && selectedCount < totalCount;

    return (
        <>
            <Checkbox
                icon={<CheckBoxOutlineBlankIcon />}
                checkedIcon={<CheckBoxIcon />}
                indeterminateIcon={<IndeterminateCheckBoxIcon />}
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
                title={t('bulkActions.selectAll')}
            />
            {selectedCount > 0 ? (
                <>
                    <IconButton onClick={onMarkAsRead} title={t('bulkActions.markAsRead')}>
                        <MarkEmailReadIcon />
                    </IconButton>
                    <IconButton onClick={onMarkAsUnread} title={t('bulkActions.markAsUnread')}>
                        <MarkEmailUnreadIcon />
                    </IconButton>
                    <IconButton onClick={onMarkAsFlagged} title={t('bulkActions.markAsFlagged')}>
                        <StarIcon />
                    </IconButton>
                    <IconButton
                        onClick={onMarkAsUnflagged}
                        title={t('bulkActions.markAsUnflagged')}
                    >
                        <StarBorderIcon />
                    </IconButton>
                    <IconButton onClick={onDelete} color="error" title={t('bulkActions.delete')}>
                        <DeleteIcon />
                    </IconButton>
                    <ListItemText
                        primary={`${selectedCount} selected`}
                        primaryTypographyProps={{
                            variant: 'subtitle1',
                        }}
                        sx={{ ml: 2 }}
                    />
                </>
            ) : (
                <>
                    <IconButton onClick={onRefresh} title={t('bulkActions.refresh')}>
                        <RefreshIcon />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {totalCount} {totalCount === 1 ? 'message' : 'messages'}
                    </Typography>
                </>
            )}
        </>
    );
}
