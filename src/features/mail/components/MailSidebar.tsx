import { useState } from 'preact/hooks';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import Sidebar from '../../../components/Sidebar';
import MailboxListItem from './MailboxListItem';
import { Mailbox } from '../data/mailboxes';
import { MailboxNode } from '../utils/mailboxHelpers';
import SharedMailboxList from './SharedMailboxList';

interface MailSidebarProps {
    accountId: string | null;
    loading: boolean;
    mailboxTree: MailboxNode[];
    sharedMailboxes: Mailbox[];
    selectedMailbox: string;
    expandedFolders: Set<string>;
    onComposeClick: () => void;
    onMailboxSelect: (name: string, isLeaf: boolean) => void;
    onToggleFolder: (folderName: string) => void;
    onContextMenu: (event: MouseEvent, mailbox: MailboxNode) => void;
    onDrop: (e: DragEvent, targetMailboxId: string) => void;
    onDragOver: (e: DragEvent) => void;
    onCreateMailbox: (name: string, parentId?: string) => Promise<void>;
}

export default function MailSidebar({
    accountId,
    loading,
    mailboxTree,
    sharedMailboxes,
    selectedMailbox,
    expandedFolders,
    onComposeClick,
    onMailboxSelect,
    onToggleFolder,
    onContextMenu,
    onDrop,
    onDragOver,
    onCreateMailbox,
}: MailSidebarProps) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newMailboxName, setNewMailboxName] = useState('');
    const [parentMailboxId, setParentMailboxId] = useState<string>('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateClick = () => {
        setCreateDialogOpen(true);
        setNewMailboxName('');
        setParentMailboxId('');
        setError(null);
    };

    const handleCreateSubmit = async () => {
        if (!newMailboxName.trim()) {
            setError('Mailbox name is required');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            await onCreateMailbox(newMailboxName.trim(), parentMailboxId || undefined);
            setCreateDialogOpen(false);
            setNewMailboxName('');
            setParentMailboxId('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create mailbox');
        } finally {
            setCreating(false);
        }
    };

    const getAllMailboxes = (nodes: MailboxNode[]): MailboxNode[] => {
        const result: MailboxNode[] = [];
        const traverse = (node: MailboxNode) => {
            result.push(node);
            if (node.children) {
                node.children.forEach(traverse);
            }
        };
        nodes.forEach(traverse);
        return result;
    };

    if (!accountId) {
        return (
            <Sidebar>
                <Stack justifyContent="center" padding={3}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                        Loading account...
                    </Typography>
                </Stack>
            </Sidebar>
        );
    }

    return (
        <Sidebar>
            <Button
                variant="contained"
                fullWidth
                onClick={onComposeClick}
                startIcon={<EditIcon />}
            >
                Compose Email
            </Button>

            <Divider sx={{ my: 2 }} />

            {loading ? (
                <Stack justifyContent="center" padding={3}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                        Loading mailboxes...
                    </Typography>
                </Stack>
            ) : mailboxTree.length === 0 ? (
                <Stack justifyContent="center" padding={3}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        No mailboxes found
                    </Typography>
                </Stack>
            ) : (
                <>
                    <List>
                        {mailboxTree.map((node) => (
                            <MailboxListItem
                                key={node.name}
                                node={node}
                                selectedMailbox={selectedMailbox}
                                expandedFolders={expandedFolders}
                                onMailboxSelect={onMailboxSelect}
                                onToggleFolder={onToggleFolder}
                                onContextMenu={onContextMenu}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                            />
                        ))}
                    </List>

                    <Stack sx={{ px: 2, pb: 1 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={handleCreateClick}
                            startIcon={<CreateNewFolderIcon />}
                            size="small"
                        >
                            New Folder
                        </Button>
                    </Stack>

                    {sharedMailboxes.length > 0 && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2" padding={2} color="text.secondary">
                                Shared Mailboxes
                            </Typography>
                            <SharedMailboxList
                                sharedMailboxes={sharedMailboxes}
                                selectedMailbox={selectedMailbox}
                                expandedFolders={expandedFolders}
                                onMailboxSelect={onMailboxSelect}
                                onToggleFolder={onToggleFolder}
                                onContextMenu={onContextMenu}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                            />
                        </>
                    )}
                </>
            )}

            {/* Create Mailbox Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={() => !creating && setCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} pt={1}>
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            label="Folder Name"
                            fullWidth
                            value={newMailboxName}
                            onChange={(e) =>
                                setNewMailboxName((e.target as HTMLInputElement).value)
                            }
                            disabled={creating}
                            autoFocus
                            required
                        />

                        <TextField
                            label="Parent Folder (Optional)"
                            fullWidth
                            select
                            value={parentMailboxId}
                            onChange={(e) =>
                                setParentMailboxId((e.target as HTMLSelectElement).value)
                            }
                            disabled={creating}
                            helperText="Leave empty to create a top-level folder"
                        >
                            <MenuItem value="">None (Top Level)</MenuItem>
                            {getAllMailboxes(mailboxTree).map((mailbox) => (
                                <MenuItem key={mailbox.id} value={mailbox.id}>
                                    {mailbox.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={creating || !newMailboxName.trim()}
                    >
                        {creating ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Sidebar>
    );
}
