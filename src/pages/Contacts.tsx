import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ContactsIcon from '@mui/icons-material/Contacts';
import { fetchContacts, deleteContact, updateContact, Contact } from '../data/contacts';
import { fetchAddressBooks, AddressBook } from '../data/addressBook';
import { getPrimaryAccountId } from '../data/accounts';

const drawerWidth = 240;

interface ContactsProps {
    path: string;
}

export default function Contacts({ path }: ContactsProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [addressBooks, setAddressBooks] = useState<AddressBook[]>([]);
    const [selectedAddressBook, setSelectedAddressBook] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        loadAccount();
    }, []);

    const loadAccount = async () => {
        try {
            const id = await getPrimaryAccountId();
            setAccountId(id);
            await Promise.all([loadAddressBooks(id), loadContacts(id)]);
        } catch (error) {
            console.error('Failed to load account:', error);
            if (error instanceof Error && error.message.includes('not initialized')) {
                route('/login');
            }
        }
    };

    const loadAddressBooks = async (accId: string) => {
        try {
            const data = await fetchAddressBooks(accId);
            setAddressBooks(data);
        } catch (err) {
            console.error('Failed to load address books:', err);
        }
    };

    const loadContacts = async (accId: string, addressBookId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchContacts(accId, addressBookId);
            setContacts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load contacts');
            console.error('Failed to load contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressBookClick = (addressBookId: string | undefined) => {
        setSelectedAddressBook(addressBookId);
        if (accountId) {
            loadContacts(accountId, addressBookId);
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        if (!accountId) return;
        if (!confirm('Are you sure you want to delete this contact?')) return;

        try {
            await deleteContact(accountId, contactId);
            loadContacts(accountId, selectedAddressBook);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete contact');
        }
    };

    const handleToggleFavorite = async (contact: Contact) => {
        if (!accountId) return;

        try {
            await updateContact(accountId, contact.id, { isFavorite: !contact.isFavorite });
            loadContacts(accountId, selectedAddressBook);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update contact');
        }
    };

    const getInitials = (contact: Contact) => {
        const first = contact.firstName?.[0] || '';
        const last = contact.lastName?.[0] || '';
        return (first + last).toUpperCase() || '?';
    };

    const getDisplayName = (contact: Contact) => {
        if (contact.firstName || contact.lastName) {
            return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        }
        return contact.email || 'Unknown';
    };

    return (
        <Box display="flex">
            {/* Address books sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <Toolbar />
                <Box style={{ overflow: 'auto' }}>
                    {!accountId ? (
                        <Stack justifyContent="center" padding={3}>
                            <CircularProgress />
                        </Stack>
                    ) : (
                        <>
                            <List>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        selected={selectedAddressBook === undefined}
                                        onClick={() => handleAddressBookClick(undefined)}
                                    >
                                        <ListItemText
                                            primary="All Contacts"
                                            primaryTypographyProps={{ fontWeight: 'bold' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            </List>
                            {addressBooks.length > 0 && (
                                <>
                                    <Divider />
                                    <Typography
                                        variant="overline"
                                        sx={{ px: 2, py: 1, display: 'block' }}
                                    >
                                        Address Books
                                    </Typography>
                                    <List>
                                        {addressBooks.map((ab) => (
                                            <ListItem key={ab.id} disablePadding>
                                                <ListItemButton
                                                    selected={selectedAddressBook === ab.id}
                                                    onClick={() => handleAddressBookClick(ab.id)}
                                                >
                                                    <ListItemText
                                                        primary={ab.name}
                                                        secondary={
                                                            ab.isDefault ? 'Default' : undefined
                                                        }
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                </>
                            )}
                        </>
                    )}
                </Box>
            </Drawer>

            {/* Contacts list */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',
                }}
            >
                <Toolbar />
                <Box p={3}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Stack justifyContent="center" alignItems="center" minHeight="50vh">
                            <CircularProgress />
                        </Stack>
                    ) : contacts.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <ContactsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No contacts yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Add your first contact to get started
                            </Typography>
                        </Paper>
                    ) : (
                        <Paper>
                            <List>
                                {contacts.map((contact, index) => (
                                    <ListItem
                                        key={contact.id}
                                        divider={index < contacts.length - 1}
                                        secondaryAction={
                                            <Stack direction="row" spacing={1}>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleToggleFavorite(contact)}
                                                    size="small"
                                                >
                                                    {contact.isFavorite ? (
                                                        <StarIcon color="warning" />
                                                    ) : (
                                                        <StarBorderIcon />
                                                    )}
                                                </IconButton>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() =>
                                                        alert('Edit contact - coming soon!')
                                                    }
                                                    size="small"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleDeleteContact(contact.id)}
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Stack>
                                        }
                                    >
                                        <ListItemAvatar>
                                            <Avatar>{getInitials(contact)}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={getDisplayName(contact)}
                                            secondary={
                                                <Stack spacing={0.5}>
                                                    {contact.email && <span>{contact.email}</span>}
                                                    {contact.company && (
                                                        <span>{contact.company}</span>
                                                    )}
                                                    {contact.jobTitle && (
                                                        <span>{contact.jobTitle}</span>
                                                    )}
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    )}
                </Box>

                <Fab
                    color="primary"
                    aria-label="add contact"
                    onClick={() => alert('Create contact - coming soon!')}
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                >
                    <AddIcon />
                </Fab>
            </Box>
        </Box>
    );
}
