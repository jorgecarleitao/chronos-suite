import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    allSelected: boolean;
    someSelected: boolean;
    onSelectAll: () => void;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
    onDelete: () => void;
    onRefresh: () => void;
}

export default function BulkActionsBar({
    selectedCount,
    totalCount,
    allSelected,
    someSelected,
    onSelectAll,
    onMarkAsRead,
    onMarkAsUnread,
    onDelete,
    onRefresh,
}: BulkActionsBarProps) {
    return (
        <>
            <Checkbox
                icon={<CheckBoxOutlineBlankIcon />}
                checkedIcon={<CheckBoxIcon />}
                indeterminateIcon={<IndeterminateCheckBoxIcon />}
                checked={allSelected && totalCount > 0}
                indeterminate={someSelected}
                onChange={onSelectAll}
                title="Select all"
            />
            {selectedCount > 0 ? (
                <>
                    <IconButton onClick={onMarkAsRead} title="Mark as read">
                        <MarkEmailReadIcon />
                    </IconButton>
                    <IconButton onClick={onMarkAsUnread} title="Mark as unread">
                        <MarkEmailUnreadIcon />
                    </IconButton>
                    <IconButton onClick={onDelete} color="error" title="Delete">
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
                    <IconButton onClick={onRefresh} title="Reload messages">
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
