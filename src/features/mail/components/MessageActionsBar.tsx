import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import ReplyAllIcon from '@mui/icons-material/ReplyAll';
import ForwardIcon from '@mui/icons-material/Forward';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

interface MessageActionsBarProps {
    onClose: () => void;
    onReply: () => void;
    onReplyAll: () => void;
    onForward: () => void;
    onDelete: () => void;
    onSend?: () => void;
    isDraft: boolean;
    sending: boolean;
}

export default function MessageActionsBar({
    onClose,
    onReply,
    onReplyAll,
    onForward,
    onDelete,
    onSend,
    isDraft,
    sending,
}: MessageActionsBarProps) {
    const { t } = useTranslation();
    return (
        <>
            <IconButton onClick={onClose} title={t('messageActions.backToList')}>
                <CloseIcon />
            </IconButton>
            {!isDraft ? (
                <>
                    <IconButton onClick={onReply} title={t('messageActions.reply')}>
                        <ReplyIcon />
                    </IconButton>
                    <IconButton onClick={onReplyAll} title={t('messageActions.replyAll')}>
                        <ReplyAllIcon />
                    </IconButton>
                    <IconButton onClick={onForward} title={t('messageActions.forward')}>
                        <ForwardIcon />
                    </IconButton>
                </>
            ) : (
                onSend && (
                    <Button
                        variant="contained"
                        startIcon={
                            sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />
                        }
                        onClick={onSend}
                        disabled={sending}
                        size="small"
                    >
                        {sending ? t('messageActions.sending') : t('compose.send')}
                    </Button>
                )
            )}
            <IconButton onClick={onDelete} color="error" title={t('common.delete')}>
                <DeleteIcon />
            </IconButton>
        </>
    );
}
