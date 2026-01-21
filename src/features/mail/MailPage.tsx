import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import MailSidebar from './components/MailSidebar';
import MessageList from './components/MessageList';
import ComposeEmail from './components/ComposeEmail';
import MailboxDialogs from './components/MailboxDialogs';
import {
    fetchMailboxes,
    fetchSharedMailboxes,
    createMailbox,
    renameMailbox,
    deleteMailbox,
    Mailbox,
} from './data/mailboxes';
import { getPrimaryAccountId } from '../../data/accounts';
import { moveMessages } from './data/messages';
import {
    convertToNode,
    sortMailboxes,
    isSelectableMailbox,
    findInbox,
    MailboxNode,
} from './utils/mailboxHelpers';

interface MailProps {
    path: string;
}

export default function Mail({ path }: MailProps) {
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [sharedMailboxes, setSharedMailboxes] = useState<Mailbox[]>([]);
    const [selectedMailbox, setSelectedMailbox] = useState<string>('INBOX');
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['INBOX']));
    const [composeOpen, setComposeOpen] = useState(false);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        mailbox: MailboxNode;
    } | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [newMailboxName, setNewMailboxName] = useState('');
    const [selectedMailboxForAction, setSelectedMailboxForAction] = useState<MailboxNode | null>(
        null
    );

    useEffect(() => {
        // Check authentication will be handled by the backend
        // If session cookie is invalid, API calls will return 401
        loadAccount();
    }, []);

    const loadAccount = async () => {
        try {
            const id = await getPrimaryAccountId();
            setAccountId(id);
            loadMailboxes(id);
        } catch (error) {
            console.error('Failed to load account:', error);
            if (error instanceof Error && error.message.includes('not initialized')) {
                route('/login');
            }
        }
    };

    const loadMailboxes = async (accId: string) => {
        try {
            const data = await fetchMailboxes(accId);
            setMailboxes(data.mailboxes || []);

            // Auto-select inbox mailbox
            const inboxMailbox = findInbox(data.mailboxes || []);
            if (inboxMailbox) {
                setSelectedMailbox(inboxMailbox.name);
            }

            // Fetch shared mailboxes
            try {
                const shared = await fetchSharedMailboxes();
                setSharedMailboxes(shared);
            } catch (sharedError) {
                console.warn('Failed to load shared mailboxes:', sharedError);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error) || 'Unknown error';
            console.error('Failed to load mailboxes:', errorMessage, error);
            if (errorMessage.includes('not initialized')) {
                route('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshMailboxes = () => {
        if (accountId) {
            loadMailboxes(accountId);
        }
    };

    const handleToggleFolder = (folderName: string) => {
        setExpandedFolders((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(folderName)) {
                newSet.delete(folderName);
            } else {
                newSet.add(folderName);
            }
            return newSet;
        });
    };

    const handleContextMenu = (event: MouseEvent, mailbox: MailboxNode) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            mailbox,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleCreateMailbox = async () => {
        if (!accountId || !newMailboxName.trim()) return;
        try {
            const parentId = selectedMailboxForAction?.id;
            await createMailbox(accountId, newMailboxName.trim(), parentId);
            await loadMailboxes(accountId);
            setCreateDialogOpen(false);
            setNewMailboxName('');
            setSelectedMailboxForAction(null);
        } catch (error) {
            console.error('Failed to create mailbox:', error);
            alert(error instanceof Error ? error.message : 'Failed to create mailbox');
        }
    };

    const handleRenameMailbox = async () => {
        if (!accountId || !selectedMailboxForAction?.id || !newMailboxName.trim()) return;
        try {
            await renameMailbox(accountId, selectedMailboxForAction.id, newMailboxName.trim());
            await loadMailboxes(accountId);
            setRenameDialogOpen(false);
            setNewMailboxName('');
            setSelectedMailboxForAction(null);
        } catch (error) {
            console.error('Failed to rename mailbox:', error);
            alert(error instanceof Error ? error.message : 'Failed to rename mailbox');
        }
    };

    const handleDeleteMailbox = async () => {
        if (!accountId || !selectedMailboxForAction?.id) return;
        try {
            await deleteMailbox(accountId, selectedMailboxForAction.id);
            await loadMailboxes(accountId);
            setDeleteDialogOpen(false);
            setSelectedMailboxForAction(null);
        } catch (error) {
            console.error('Failed to delete mailbox:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete mailbox');
        }
    };

    const handleDrop = async (e: DragEvent, targetMailboxId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!accountId) return;

        try {
            const messageIds = JSON.parse(e.dataTransfer!.getData('messageIds') || '[]');
            if (messageIds.length > 0) {
                await moveMessages(accountId, messageIds, targetMailboxId);
                // Trigger refresh of message list
                setRefreshTrigger((prev) => prev + 1);
            }
        } catch (error) {
            console.error('Failed to move messages:', error);
            alert(error instanceof Error ? error.message : 'Failed to move messages');
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
    };

    const handleMailboxSelect = (name: string, isLeaf: boolean) => {
        if (isLeaf) {
            setSelectedMailbox(name);
        }
    };

    // Convert backend tree structure to frontend nodes and sort
    const mailboxTree = sortMailboxes(mailboxes.map(convertToNode));
    const isActualMailbox = isSelectableMailbox(selectedMailbox, mailboxes);

    return (
        <Box display="flex">
            <MailSidebar
                accountId={accountId}
                loading={loading}
                mailboxTree={mailboxTree}
                sharedMailboxes={sharedMailboxes}
                selectedMailbox={selectedMailbox}
                expandedFolders={expandedFolders}
                onComposeClick={() => setComposeOpen(true)}
                onMailboxSelect={handleMailboxSelect}
                onToggleFolder={handleToggleFolder}
                onContextMenu={handleContextMenu}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            />

            {/* Message list area */}
            <Box component="main" flexGrow={1} padding={3}>
                <Toolbar />
                <Paper style={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
                    {selectedMailbox && isActualMailbox && accountId ? (
                        <MessageList
                            key={`${selectedMailbox}-${refreshTrigger}`}
                            mailbox={selectedMailbox}
                            accountId={accountId}
                            onMailboxChange={refreshMailboxes}
                        />
                    ) : (
                        <Stack justifyContent="center" alignItems="center" height="100%">
                            <Typography color="text.secondary">
                                {selectedMailbox
                                    ? 'This is a folder. Select a mailbox to view messages.'
                                    : 'Select a mailbox to view messages'}
                            </Typography>
                        </Stack>
                    )}
                </Paper>
            </Box>

            <ComposeEmail
                open={composeOpen}
                onClose={() => setComposeOpen(false)}
                accountId={accountId || ''}
            />

            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem
                    onClick={() => {
                        setSelectedMailboxForAction(contextMenu?.mailbox || null);
                        setNewMailboxName('');
                        setCreateDialogOpen(true);
                        handleCloseContextMenu();
                    }}
                >
                    Create Subfolder
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setSelectedMailboxForAction(contextMenu?.mailbox || null);
                        setNewMailboxName(contextMenu?.mailbox.displayName || '');
                        setRenameDialogOpen(true);
                        handleCloseContextMenu();
                    }}
                >
                    Rename
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setSelectedMailboxForAction(contextMenu?.mailbox || null);
                        setDeleteDialogOpen(true);
                        handleCloseContextMenu();
                    }}
                >
                    Delete
                </MenuItem>
            </Menu>

            <MailboxDialogs
                createDialogOpen={createDialogOpen}
                renameDialogOpen={renameDialogOpen}
                deleteDialogOpen={deleteDialogOpen}
                newMailboxName={newMailboxName}
                selectedMailboxForAction={selectedMailboxForAction}
                onCreateClose={() => setCreateDialogOpen(false)}
                onRenameClose={() => setRenameDialogOpen(false)}
                onDeleteClose={() => setDeleteDialogOpen(false)}
                onNameChange={setNewMailboxName}
                onCreateSubmit={handleCreateMailbox}
                onRenameSubmit={handleRenameMailbox}
                onDeleteSubmit={handleDeleteMailbox}
            />
        </Box>
    );
}
