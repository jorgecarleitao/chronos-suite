import { useState, useEffect } from 'preact/hooks';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { CalendarEvent, Participant } from '../../../../data/calendarEvents';
import { CalendarEventFormData } from '../../types';

interface EventDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    event: CalendarEvent | null;
    initialDate: Date;
    onClose: () => void;
    onSubmit: (data: CalendarEventFormData) => void;
    onDelete?: () => void;
}

export default function EventDialog({
    open,
    mode,
    event,
    initialDate,
    onClose,
    onSubmit,
    onDelete,
}: EventDialogProps) {
    const [participantEmail, setParticipantEmail] = useState('');
    const [participantName, setParticipantName] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        description: '',
        participants: [] as Participant[],
    });

    // Initialize form data when dialog opens
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && event) {
                setFormData({
                    title: event.title,
                    startDate: event.start.toISOString().split('T')[0],
                    startTime: event.start.toTimeString().slice(0, 5),
                    endDate: event.end.toISOString().split('T')[0],
                    endTime: event.end.toTimeString().slice(0, 5),
                    description: event.description || '',
                    participants: event.participants || [],
                });
            } else {
                const dateStr = initialDate.toISOString().split('T')[0];
                const startHour = initialDate.getHours();
                const startTime = `${String(startHour).padStart(2, '0')}:00`;
                const endTime = `${String(startHour + 1).padStart(2, '0')}:00`;
                setFormData({
                    title: '',
                    startDate: dateStr,
                    startTime: startTime,
                    endDate: dateStr,
                    endTime: endTime,
                    description: '',
                    participants: [],
                });
            }
        }
    }, [open, mode, event, initialDate]);

    const handleAddParticipant = () => {
        if (!participantEmail.trim()) return;

        const newParticipant: Participant = {
            email: participantEmail.trim(),
            name: participantName.trim() || undefined,
            role: 'attendee',
            rsvp: true,
        };

        setFormData({
            ...formData,
            participants: [...formData.participants, newParticipant],
        });

        setParticipantEmail('');
        setParticipantName('');
    };

    const handleRemoveParticipant = (index: number) => {
        const updatedParticipants = formData.participants.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            participants: updatedParticipants,
        });
    };

    const handleSubmit = () => {
        const start = new Date(`${formData.startDate}T${formData.startTime}`);
        const end = new Date(`${formData.endDate}T${formData.endTime}`);
        
        onSubmit({
            title: formData.title,
            start,
            end,
            description: formData.description,
            participants: formData.participants,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: (e.target as HTMLInputElement).value })}
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: (e.target as HTMLInputElement).value })}
                        />
                        <TextField
                            label="Start Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: (e.target as HTMLInputElement).value })}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: (e.target as HTMLInputElement).value })}
                        />
                        <TextField
                            label="End Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: (e.target as HTMLInputElement).value })}
                        />
                    </Stack>
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLInputElement).value })}
                    />

                    {/* Participants Section */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonAddIcon fontSize="small" />
                            Invite Participants
                        </Typography>
                        
                        {/* Display existing participants */}
                        {formData.participants.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {formData.participants.map((participant, index) => (
                                    <Chip
                                        key={index}
                                        label={participant.name || participant.email}
                                        onDelete={() => handleRemoveParticipant(index)}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        )}

                        {/* Add participant form */}
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                label="Email"
                                type="email"
                                placeholder="attendee@example.com"
                                value={participantEmail}
                                onChange={(e) => setParticipantEmail((e.target as HTMLInputElement).value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddParticipant();
                                    }
                                }}
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                size="small"
                                label="Name (optional)"
                                placeholder="John Doe"
                                value={participantName}
                                onChange={(e) => setParticipantName((e.target as HTMLInputElement).value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddParticipant();
                                    }
                                }}
                                sx={{ flex: 2 }}
                            />
                            <IconButton
                                color="primary"
                                onClick={handleAddParticipant}
                                disabled={!participantEmail.trim()}
                                size="small"
                            >
                                <AddIcon />
                            </IconButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Participants will receive email invitations with calendar event details
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                {mode === 'edit' && onDelete && (
                    <Button 
                        onClick={onDelete} 
                        color="error" 
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                )}
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
                    {mode === 'create' ? 'Create & Send Invites' : 'Save & Update Invites'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
