import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    return (
        <>
            {/* Create Mailbox Dialog */}
            <Dialog open={createDialogOpen} onClose={onCreateClose}>
                <DialogTitle>
                    {selectedMailboxForAction ? t('mailbox.createSubfolderTitle') : t('mailbox.createMailbox')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('mailbox.mailboxName')}
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
                    <Button onClick={onCreateClose}>{t('common.cancel')}</Button>
                    <Button onClick={onCreateSubmit} variant="contained">
                        {t('common.create')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename Mailbox Dialog */}
            <Dialog open={renameDialogOpen} onClose={onRenameClose}>
                <DialogTitle>{t('mailbox.renameMailbox')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('mailbox.newName')}
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
                    <Button onClick={onRenameClose}>{t('common.cancel')}</Button>
                    <Button onClick={onRenameSubmit} variant="contained">
                        {t('common.rename')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Mailbox Dialog */}
            <Dialog open={deleteDialogOpen} onClose={onDeleteClose}>
                <DialogTitle>{t('mailbox.deleteMailbox')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('mailbox.confirmDelete', { name: selectedMailboxForAction?.displayName || '' })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onDeleteClose}>{t('common.cancel')}</Button>
                    <Button onClick={onDeleteSubmit} color="error" variant="contained">
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
