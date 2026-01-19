import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MailboxNode } from '../utils/mailboxHelpers';

interface MailboxDialogsProps {
    createDialogOpen: boolean;
    renameDialogOpen: boolean;
    deleteDialogOpen: boolean;
    newMailboxName: string;
    selectedMailboxForAction: MailboxNode | null;
    onCreateClose: () => void;
    onRenameClose: () => void;
    onDeleteClose: () => void;
    onNameChange: (name: string) => void;
    onCreateSubmit: () => void;
    onRenameSubmit: () => void;
    onDeleteSubmit: () => void;
}

export default function MailboxDialogs({
    createDialogOpen,
    renameDialogOpen,
    deleteDialogOpen,
    newMailboxName,
    selectedMailboxForAction,
    onCreateClose,
    onRenameClose,
    onDeleteClose,
    onNameChange,
    onCreateSubmit,
    onRenameSubmit,
    onDeleteSubmit,
}: MailboxDialogsProps) {
    return (
        <>
            {/* Create Mailbox Dialog */}
            <Dialog open={createDialogOpen} onClose={onCreateClose}>
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
                        onChange={(e) => onNameChange((e.target as HTMLInputElement).value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                onCreateSubmit();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCreateClose}>Cancel</Button>
                    <Button onClick={onCreateSubmit} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename Mailbox Dialog */}
            <Dialog open={renameDialogOpen} onClose={onRenameClose}>
                <DialogTitle>Rename Mailbox</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New Name"
                        fullWidth
                        value={newMailboxName}
                        onChange={(e) => onNameChange((e.target as HTMLInputElement).value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                onRenameSubmit();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onRenameClose}>Cancel</Button>
                    <Button onClick={onRenameSubmit} variant="contained">
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Mailbox Dialog */}
            <Dialog open={deleteDialogOpen} onClose={onDeleteClose}>
                <DialogTitle>Delete Mailbox</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete "{selectedMailboxForAction?.displayName}"?
                        This will permanently delete the mailbox and all its contents.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onDeleteClose}>Cancel</Button>
                    <Button onClick={onDeleteSubmit} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
