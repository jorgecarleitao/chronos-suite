import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import Sidebar from '../../../components/Sidebar';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { UICalendar } from '../data/calendar';

interface CalendarSidebarProps {
    loading: boolean;
    calendars: UICalendar[];
    visibleCalendarIds: string[];
    onToggleCalendar: (calendarId: string) => void;
    onCreateEvent: () => void;
    onCreateCalendar: () => void;
    onEditCalendar: (calendar: UICalendar) => void;
    onDeleteCalendar: (calendar: UICalendar) => void;
}

export default function CalendarSidebar({
    loading,
    calendars,
    visibleCalendarIds,
    onToggleCalendar,
    onCreateEvent,
    onCreateCalendar,
    onEditCalendar,
    onDeleteCalendar,
}: CalendarSidebarProps) {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [menuCalendar, setMenuCalendar] = useState<UICalendar | null>(null);

    const handleMenuOpen = (event: MouseEvent, calendar: UICalendar) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget as HTMLElement);
        setMenuCalendar(calendar);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuCalendar(null);
    };

    const handleEdit = () => {
        if (menuCalendar) {
            onEditCalendar(menuCalendar);
        }
        handleMenuClose();
    };

    const handleDelete = () => {
        if (menuCalendar) {
            onDeleteCalendar(menuCalendar);
        }
        handleMenuClose();
    };

    return (
        <Sidebar>
            {loading ? (
                <Stack justifyContent="center" padding={3}>
                    <CircularProgress />
                </Stack>
            ) : (
                <>
                    <Button
                        variant="contained"
                        fullWidth
                        sx={{ mb: 2 }}
                        onClick={onCreateEvent}
                        startIcon={<AddIcon />}
                    >
                        {t('calendar.createEvent')}
                    </Button>

                    <Divider sx={{ my: 2 }} />

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1,
                        }}
                    >
                        <Typography variant="subtitle2">{t('calendar.myCalendars')}</Typography>
                        <IconButton
                            size="small"
                            onClick={onCreateCalendar}
                            title={t('calendar.createCalendar')}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <List>
                        {calendars.map((cal) => (
                            <ListItem
                                key={cal.id}
                                disablePadding
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={(e) => handleMenuOpen(e as any, cal)}
                                        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                                    >
                                        <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemButton onClick={() => onToggleCalendar(cal.id)} dense>
                                    <Checkbox
                                        edge="start"
                                        checked={visibleCalendarIds.includes(cal.id)}
                                        tabIndex={-1}
                                        disableRipple
                                        sx={{ mr: 1 }}
                                    />
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor: cal.color || '#1976d2',
                                            mr: 1.5,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <ListItemText
                                        primary={cal.name}
                                        secondary={
                                            cal.isDefault
                                                ? t('calendar.defaultCalendar')
                                                : undefined
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                        {menuCalendar?.isEditable && (
                            <MenuItem onClick={handleEdit}>
                                <ListItemIcon>
                                    <EditIcon fontSize="small" />
                                </ListItemIcon>
                                {t('calendar.editCalendar')}
                            </MenuItem>
                        )}
                        {menuCalendar?.isDeletable && (
                            <MenuItem onClick={handleDelete}>
                                <ListItemIcon>
                                    <DeleteIcon fontSize="small" />
                                </ListItemIcon>
                                {t('calendar.deleteCalendar')}
                            </MenuItem>
                        )}
                        {!menuCalendar?.isEditable && !menuCalendar?.isDeletable && (
                            <MenuItem disabled>
                                <ListItemIcon>
                                    <EventIcon fontSize="small" />
                                </ListItemIcon>
                                {t('calendar.noActionsAvailable')}
                            </MenuItem>
                        )}
                    </Menu>
                </>
            )}
        </Sidebar>
    );
}
