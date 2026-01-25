import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
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
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ContactsIcon from '@mui/icons-material/Contacts';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import Sidebar, { drawerWidth } from '../../components/Sidebar';
// Contact data modules
import { actions as contactActions, type UIContact } from './data/contact';
import { actions as addressBookActions, type UIAddressBook } from './data/addressBook';
import type { UIContactFormData } from './data/contact/ui';
import { getPrimaryAccountId } from '../../data/accounts';
import { useTranslation } from 'react-i18next';

interface ContactsProps {
    path: string;
}

export default function Contacts({ path }: ContactsProps) {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<UIContact[]>([]);
    const [addressBooks, setAddressBooks] = useState<UIAddressBook[]>([]);
    const [selectedAddressBook, setSelectedAddressBook] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingContact, setEditingContact] = useState<UIContact | null>(null);
    const [originalFormData, setOriginalFormData] = useState<Partial<UIContact>>({});
    const [formData, setFormData] = useState<Partial<UIContact>>({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        jobTitle: '',
        notes: '',
        phones: [],
        addresses: [],
    });

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
            const data = await addressBookActions.fetchAddressBooks(accId);
            setAddressBooks(data);
        } catch (err) {
            console.error('Failed to load address books:', err);
        }
    };

    const loadContacts = async (accId: string, addressBookId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await contactActions.fetchContacts(accId, addressBookId);
            setContacts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('contacts.failedToLoadContacts'));
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
        if (!confirm(t('contacts.confirmDelete'))) return;

        try {
            await contactActions.deleteContact(accountId, contactId);
            loadContacts(accountId, selectedAddressBook);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('contacts.failedToDeleteContact'));
        }
    };

    const handleToggleFavorite = async (contact: UIContact) => {
        if (!accountId) return;

        try {
            await contactActions.updateContact(accountId, contact.id, { isFavorite: !contact.isFavorite });
            loadContacts(accountId, selectedAddressBook);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('contacts.failedToUpdateContact'));
        }
    };

    const getInitials = (contact: UIContact) => {
        const first = contact.firstName?.[0] || '';
        const last = contact.lastName?.[0] || '';
        return (first + last).toUpperCase() || '?';
    };

    const getDisplayName = (contact: UIContact) => {
        if (contact.firstName || contact.lastName) {
            return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        }
        return contact.email || t('messageMetadata.unknown');
    };

    const handleCreateClick = () => {
        setIsCreating(true);
        setEditingContact(null);
        const emptyForm = {
            firstName: '',
            lastName: '',
            email: '',
            company: '',
            jobTitle: '',
            notes: '',
            phones: [],
            addresses: [],
        };
        setFormData(emptyForm);
        setOriginalFormData(emptyForm);
    };

    const handleEditClick = (contact: UIContact) => {
        setIsCreating(true);
        setEditingContact(contact);
        const contactForm = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || '',
            company: contact.company || '',
            jobTitle: contact.jobTitle || '',
            notes: contact.notes || '',
            phones: contact.phones || [],
            addresses: contact.addresses || [],
        };
        setFormData(contactForm);
        setOriginalFormData(contactForm);
    };

    const handleCancelCreate = () => {
        setIsCreating(false);
        setEditingContact(null);
    };

    const handleSaveContact = async () => {
        if (!accountId) return;

        try {
            setLoading(true);

            if (editingContact) {
                // Update existing contact
                await contactActions.updateContact(accountId, editingContact.id, formData);
            } else {
                // Create new contact
                const targetAddressBook =
                    addressBooks.find((ab) => ab.isDefault) || addressBooks[0];
                if (!targetAddressBook) {
                    setError('No address book available. Please create an address book first.');
                    return;
                }
                await contactActions.createContact(accountId, targetAddressBook.id, formData);
            }

            setIsCreating(false);
            setEditingContact(null);
            await loadContacts(accountId, selectedAddressBook);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to ${editingContact ? 'update' : 'create'} contact`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (field: keyof UIContact, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const isFieldModified = (field: keyof UIContact): boolean => {
        return formData[field] !== originalFormData[field];
    };

    return (
        <Box display="flex">
            {/* Address books sidebar */}
            <Sidebar>
                {!accountId ? (
                    <Stack justifyContent="center" padding={3}>
                        <CircularProgress />
                    </Stack>
                ) : (
                    <>
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mb: 2 }}
                            onClick={handleCreateClick}
                            startIcon={<AddIcon />}
                        >
                            {t('contacts.addContact')}
                        </Button>

                        <Divider sx={{ my: 2 }} />

                        <List>
                            <ListItem disablePadding>
                                <ListItemButton
                                    selected={selectedAddressBook === undefined}
                                    onClick={() => handleAddressBookClick(undefined)}
                                >
                                    <ListItemText
                                        primary={t('contacts.contactsAll')}
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
                                    {t('contacts.addressBooks')}
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
                                                        ab.isDefault
                                                            ? t('contacts.default')
                                                            : undefined
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
            </Sidebar>

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

                    {isCreating ? (
                        <Paper sx={{ p: 3 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={3}
                            >
                                <Typography variant="h5">
                                    {editingContact ? 'Edit Contact' : 'New Contact'}
                                </Typography>
                                <IconButton onClick={handleCancelCreate}>
                                    <CloseIcon />
                                </IconButton>
                            </Stack>

                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        label="First Name"
                                        value={formData.firstName || ''}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'firstName',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        fullWidth
                                        color={isFieldModified('firstName') ? 'warning' : 'primary'}
                                        focused={isFieldModified('firstName')}
                                    />
                                    <TextField
                                        label="Last Name"
                                        value={formData.lastName || ''}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'lastName',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        fullWidth
                                        color={isFieldModified('lastName') ? 'warning' : 'primary'}
                                        focused={isFieldModified('lastName')}
                                    />
                                </Stack>

                                <TextField
                                    label="Email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) =>
                                        handleFormChange(
                                            'email',
                                            (e.target as HTMLInputElement).value
                                        )
                                    }
                                    fullWidth
                                    color={isFieldModified('email') ? 'warning' : 'primary'}
                                    focused={isFieldModified('email')}
                                />

                                <Divider />

                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        label="Company"
                                        value={formData.company || ''}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'company',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        fullWidth
                                        color={isFieldModified('company') ? 'warning' : 'primary'}
                                        focused={isFieldModified('company')}
                                    />
                                    <TextField
                                        label="Job Title"
                                        value={formData.jobTitle || ''}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'jobTitle',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        fullWidth
                                        color={isFieldModified('jobTitle') ? 'warning' : 'primary'}
                                        focused={isFieldModified('jobTitle')}
                                    />
                                </Stack>

                                <TextField
                                    label="Notes"
                                    value={formData.notes || ''}
                                    onChange={(e) =>
                                        handleFormChange(
                                            'notes',
                                            (e.target as HTMLInputElement).value
                                        )
                                    }
                                    multiline
                                    rows={4}
                                    fullWidth
                                    color={isFieldModified('notes') ? 'warning' : 'primary'}
                                    focused={isFieldModified('notes')}
                                />

                                <Stack direction="row" spacing={2} justifyContent="flex-end">
                                    <Button onClick={handleCancelCreate}>
                                        {t('common.cancel')}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveIcon />}
                                        onClick={handleSaveContact}
                                        disabled={loading}
                                    >
                                        {editingContact
                                            ? t('contacts.updateContact')
                                            : t('contacts.saveContact')}
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    ) : loading ? (
                        <Stack justifyContent="center" alignItems="center" minHeight="50vh">
                            <CircularProgress />
                        </Stack>
                    ) : contacts.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <ContactsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                {t('contacts.noContactsYet')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                {t('contacts.addFirstContact')}
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
                                                    onClick={() => handleEditClick(contact)}
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
                                                <>
                                                    {contact.email && (
                                                        <Typography variant="body2" component="div">
                                                            {contact.email}
                                                        </Typography>
                                                    )}
                                                    {contact.company && (
                                                        <Typography
                                                            variant="body2"
                                                            component="div"
                                                            color="text.secondary"
                                                        >
                                                            {contact.company}
                                                            {contact.jobTitle &&
                                                                ` • ${contact.jobTitle}`}
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
