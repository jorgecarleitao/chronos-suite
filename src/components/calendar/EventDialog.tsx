import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { CalendarEvent } from '../../data/calendarEvents';

interface EventDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    event: CalendarEvent | null;
    formData: {
        title: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        description: string;
    };
    onClose: () => void;
    onSubmit: () => void;
    onFormChange: (formData: any) => void;
}

export default function EventDialog({
    open,
    mode,
    event,
    formData,
    onClose,
    onSubmit,
    onFormChange,
}: EventDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => onFormChange({ ...formData, title: (e.target as HTMLInputElement).value })}
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={(e) => onFormChange({ ...formData, startDate: (e.target as HTMLInputElement).value })}
                        />
                        <TextField
                            label="Start Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startTime}
                            onChange={(e) => onFormChange({ ...formData, startTime: (e.target as HTMLInputElement).value })}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={(e) => onFormChange({ ...formData, endDate: (e.target as HTMLInputElement).value })}
                        />
                        <TextField
                            label="End Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endTime}
                            onChange={(e) => onFormChange({ ...formData, endTime: (e.target as HTMLInputElement).value })}
                        />
                    </Stack>
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => onFormChange({ ...formData, description: (e.target as HTMLInputElement).value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onSubmit} variant="contained" disabled={!formData.title}>
                    {mode === 'create' ? 'Create' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
