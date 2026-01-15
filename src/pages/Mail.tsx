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
import { fetchMailboxes, fetchSharedMailboxes, Mailbox } from '../data/mailboxes';
import { getPrimaryAccountId } from '../data/accounts';

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
}

// Convert backend tree to frontend node structure (if needed for compatibility)
const convertToNode = (mailbox: Mailbox): MailboxNode => ({
    name: mailbox.name,
    displayName: mailbox.display_name,
    children: mailbox.children.map(convertToNode),
    isLeaf: mailbox.is_selectable,
    role: mailbox.role,
});

export default function Mail({ path }: MailProps) {
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [sharedMailboxes, setSharedMailboxes] = useState<Mailbox[]>([]);
    const [selectedMailbox, setSelectedMailbox] = useState<string>('INBOX');
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['INBOX']));
    const [composeOpen, setComposeOpen] = useState(false);
    const [accountId, setAccountId] = useState<string | null>(null);

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

    const renderMailboxNode = (node: MailboxNode, depth: number = 0) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedFolders.has(node.name);
        const elements = [];

        elements.push(
            <ListItem key={node.name} disablePadding>
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
                    style={{ paddingLeft: (2 + depth * 2) * 8 }}
                >
                    <ListItemIcon>{getMailboxIcon(node.role, node.name)}</ListItemIcon>
                    <ListItemText primary={node.displayName} />
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
                    <Typography variant="h6" padding={2}>
                        Mailboxes
                    </Typography>
                    <Divider />
                    {loading ? (
                        <Stack justifyContent="center" padding={3}>
                            <CircularProgress />
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
                        <MessageList mailbox={selectedMailbox} accountId={accountId} />
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
        </Box>
    );
}
