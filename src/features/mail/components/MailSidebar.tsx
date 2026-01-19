import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import Sidebar from '../../../components/Sidebar';
import MailboxListItem from './MailboxListItem';
import { Mailbox } from '../../../data/mailboxes';
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
}: MailSidebarProps) {
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
                sx={{ mb: 2 }}
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
        </Sidebar>
    );
}
