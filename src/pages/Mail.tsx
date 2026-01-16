import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Fab from '@mui/material/Fab';

import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';

import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import DraftsIcon from '@mui/icons-material/Drafts';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import FolderIcon from '@mui/icons-material/Folder';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';

import MessageList from '../components/MessageList';
import ComposeEmail from '../components/ComposeEmail';
import {
    fetchMailboxes,
    fetchSharedMailboxes,
    createMailbox,
    renameMailbox,
    deleteMailbox,
    Mailbox,
} from '../data/mailboxes';
import { getPrimaryAccountId } from '../data/accounts';
import { moveMessages } from '../data/messages';

const drawerWidth = 240;

interface MailProps {
    path: string;
}

interface MailboxNode {
    name: string; // Full path name
    displayName: string; // Just the last segment
    children: MailboxNode[];
    isLeaf: boolean;
    role?: string;
    id?: string; // JMAP mailbox ID
    parentId?: string | null;
    unreadEmails?: number;
    totalEmails?: number;
}

// Convert backend tree to frontend node structure (if needed for compatibility)
const convertToNode = (mailbox: Mailbox): MailboxNode => ({
    name: mailbox.name,
    displayName: mailbox.display_name,
    children: mailbox.children.map(convertToNode),
    isLeaf: mailbox.is_selectable,
    role: mailbox.role,
    id: mailbox.id,
    parentId: mailbox.parentId,
    unreadEmails: mailbox.unreadEmails,
    totalEmails: mailbox.totalEmails,
});

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

            // Fetch shared mailboxes
            try {
                const shared = await fetchSharedMailboxes();
                setSharedMailboxes(shared);
            } catch (sharedError) {
                console.warn('Failed to load shared mailboxes:', sharedError);
                // Don't fail the whole load if shared mailboxes fail
            }
        } catch (error) {
            console.error('Failed to load mailboxes:', error);
            // If JMAP client not initialized, redirect to login
            if (error instanceof Error && error.message.includes('not initialized')) {
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

    const renderMailboxNode = (node: MailboxNode, depth: number = 0) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedFolders.has(node.name);
        const elements = [];

        elements.push(
            <ListItem
                key={node.name}
                disablePadding
                secondaryAction={
                    !node.role && (
                        <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e as any, node);
                            }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    )
                }
            >
                <ListItemButton
                    selected={selectedMailbox === node.name && node.isLeaf}
                    onClick={() => {
                        if (hasChildren) {
                            handleToggleFolder(node.name);
                        }
                        // Only set selected mailbox if it's an actual mailbox (selectable)
                        if (node.isLeaf) {
                            setSelectedMailbox(node.name);
                        }
                    }}
                    onContextMenu={(e) => !node.role && handleContextMenu(e as any, node)}
                    onDrop={(e) => node.id && handleDrop(e as any, node.id)}
                    onDragOver={handleDragOver as any}
                    style={{ paddingLeft: (2 + depth * 2) * 8 }}
                    sx={{
                        '&.MuiListItemButton-root': {
                            transition: 'background-color 0.2s',
                        },
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    <ListItemIcon>{getMailboxIcon(node.role, node.name)}</ListItemIcon>
                    <ListItemText
                        primary={
                            node.role === 'inbox' && node.unreadEmails
                                ? `${node.displayName} (${node.unreadEmails})`
                                : node.displayName
                        }
                        primaryTypographyProps={{
                            fontWeight: node.role === 'inbox' ? 'bold' : 'normal',
                        }}
                    />
                    {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
            </ListItem>
        );

        // Render children if expanded
        if (hasChildren && isExpanded) {
            elements.push(
                <Collapse
                    key={`${node.name}-collapse`}
                    in={isExpanded}
                    timeout="auto"
                    unmountOnExit
                >
                    <List component="div" disablePadding>
                        {node.children.map((child) => renderMailboxNode(child, depth + 1))}
                    </List>
                </Collapse>
            );
        }

        return elements;
    };

    // Custom order for main mailboxes
    const MAIN_ORDER = ['inbox', 'drafts', 'sent items', 'junk mail', 'deleted items'];

    // Helper to flatten and sort mailboxes by MAIN_ORDER, then others
    function sortMailboxes(nodes: MailboxNode[]): MailboxNode[] {
        // Separate main mailboxes and others
        const main: MailboxNode[] = [];
        const others: MailboxNode[] = [];
        for (const node of nodes) {
            const idx = MAIN_ORDER.findIndex((name) => node.displayName.toLowerCase() === name);
            if (idx !== -1) {
                main[idx] = node;
            } else {
                others.push(node);
            }
        }
        // Filter out undefined slots in main
        const orderedMain = main.filter(Boolean);
        // Sort others alphabetically
        others.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return [...orderedMain, ...others];
    }

    // Convert backend tree structure to frontend nodes and sort
    const mailboxTree = sortMailboxes(mailboxes.map(convertToNode));

    // Check if selected mailbox is selectable
    const isSelectableMailbox = (name: string, mailboxes: Mailbox[]): boolean => {
        for (const mb of mailboxes) {
            if (mb.name === name) return mb.is_selectable;
            if (mb.children.length > 0 && isSelectableMailbox(name, mb.children)) {
                return true;
            }
        }
        return false;
    };
    const isActualMailbox = isSelectableMailbox(selectedMailbox, mailboxes);

    const getMailboxIcon = (role?: string, name?: string) => {
        // Use role if available (JMAP standard)
        if (role) {
            switch (role) {
                case 'inbox':
                    return <InboxIcon />;
                case 'sent':
                    return <SendIcon />;
                case 'drafts':
                    return <DraftsIcon />;
                case 'trash':
                    return <DeleteIcon />;
                case 'junk':
                    return <ReportIcon />;
                default:
                    return <FolderIcon />;
            }
        }
        return <FolderIcon />;
    };

    return (
        <Box display="flex">
            {/* Mailbox sidebar */}
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
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                textAlign="center"
                                mt={2}
                            >
                                Loading account...
                            </Typography>
                        </Stack>
                    ) : loading ? (
                        <Stack justifyContent="center" padding={3}>
                            <CircularProgress />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                textAlign="center"
                                mt={2}
                            >
                                Loading mailboxes...
                            </Typography>
                        </Stack>
                    ) : mailboxes.length === 0 ? (
                        <Stack justifyContent="center" padding={3}>
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                No mailboxes found
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            <List>{mailboxTree.map((node) => renderMailboxNode(node))}</List>

                            {sharedMailboxes.length > 0 && (
                                <>
                                    <Divider />
                                    <Typography
                                        variant="subtitle2"
                                        padding={2}
                                        color="text.secondary"
                                    >
                                        Shared Mailboxes
                                    </Typography>
                                    <List>
                                        {/* Group by account */}
                                        {Object.entries(
                                            sharedMailboxes.reduce(
                                                (acc, mailbox) => {
                                                    const accountId = mailbox.accountId!;
                                                    if (!acc[accountId]) {
                                                        acc[accountId] = {
                                                            accountName: mailbox.accountName!,
                                                            mailboxes: [],
                                                        };
                                                    }
                                                    acc[accountId].mailboxes.push(mailbox);
                                                    return acc;
                                                },
                                                {} as Record<
                                                    string,
                                                    { accountName: string; mailboxes: Mailbox[] }
                                                >
                                            )
                                        ).map(
                                            ([
                                                accountId,
                                                { accountName, mailboxes: accountMailboxes },
                                            ]) => {
                                                const accountKey = `shared-${accountId}`;
                                                const isAccountExpanded =
                                                    expandedFolders.has(accountKey);

                                                return (
                                                    <>
                                                        <ListItem key={accountKey} disablePadding>
                                                            <ListItemButton
                                                                onClick={() =>
                                                                    handleToggleFolder(accountKey)
                                                                }
                                                            >
                                                                <ListItemIcon>
                                                                    <FolderSharedIcon />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                    primary={accountName}
                                                                />
                                                                {isAccountExpanded ? (
                                                                    <ExpandLess />
                                                                ) : (
                                                                    <ExpandMore />
                                                                )}
                                                            </ListItemButton>
                                                        </ListItem>
                                                        {isAccountExpanded && (
                                                            <Collapse
                                                                in={isAccountExpanded}
                                                                timeout="auto"
                                                                unmountOnExit
                                                            >
                                                                <List
                                                                    component="div"
                                                                    disablePadding
                                                                >
                                                                    {accountMailboxes
                                                                        .map(convertToNode)
                                                                        .map((node) =>
                                                                            renderMailboxNode(
                                                                                node,
                                                                                1
                                                                            )
                                                                        )}
                                                                </List>
                                                            </Collapse>
                                                        )}
                                                    </>
                                                );
                                            }
                                        )}
                                    </List>
                                </>
                            )}
                        </>
                    )}
                </Box>
            </Drawer>

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

                {/* Floating compose button */}
                <Fab
                    color="primary"
                    aria-label="compose"
                    onClick={() => setComposeOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                    }}
                >
                    <EditIcon />
                </Fab>
            </Box>

            {/* Compose email drawer */}
            <ComposeEmail
                open={composeOpen}
                onClose={() => setComposeOpen(false)}
                accountId={accountId || ''}
            />

            {/* Context Menu */}
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

            {/* Create Mailbox Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
                <DialogTitle>
                    {selectedMailboxForAction ? 'Create Subfolder' : 'Create Mailbox'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Mailbox Name"
                        fullWidth
                        value={newMailboxName}
                        onChange={(e) => setNewMailboxName((e.target as HTMLInputElement).value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateMailbox();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateMailbox} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename Mailbox Dialog */}
            <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
                <DialogTitle>Rename Mailbox</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New Name"
                        fullWidth
                        value={newMailboxName}
                        onChange={(e) => setNewMailboxName((e.target as HTMLInputElement).value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleRenameMailbox();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRenameMailbox} variant="contained">
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Mailbox Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Mailbox</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete "{selectedMailboxForAction?.displayName}"?
                        This will permanently delete the mailbox and all its contents.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteMailbox} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
