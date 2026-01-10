import { useState, useEffect } from 'preact/hooks';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import Button from '@mui/material/Button';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import DOMPurify from 'dompurify';

interface MessageViewerProps {
	open: boolean;
	onClose: () => void;
	onDelete?: () => void;
	mailbox: string;
	uid: number;
}

interface MessageDetail {
	uid: number;
	sequence: number;
	flags: string[];
	size?: number;
	from?: string;
	to?: string;
	subject?: string;
	date?: string;
	message_id?: string;
	html_body?: string;
	text_body?: string;
}

export default function MessageViewer({ open, onClose, onDelete, mailbox, uid }: MessageViewerProps) {
	const [message, setMessage] = useState<MessageDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [parsedBody, setParsedBody] = useState<{ html?: string; text?: string } | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [sending, setSending] = useState(false);
	const [sendSuccess, setSendSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (open && uid) {
			fetchMessage();
		}
	}, [open, mailbox, uid]);

	const fetchMessage = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			const response = await fetch(
				`${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
				{
					credentials: 'include',
				}
			);

			if (!response.ok) {
				throw new Error('Failed to fetch message');
			}

			const data: MessageDetail = await response.json();
			setMessage(data);

			// Backend already parsed the email body
			if (data.html_body) {
				setParsedBody({ html: sanitizeHTML(data.html_body), text: data.text_body });
			} else if (data.text_body) {
				setParsedBody({ text: data.text_body });
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch message');
		} finally {
			setLoading(false);
		}
	};

const isDraft = () => {
	return message?.flags?.some(flag => flag === 'Draft') || false;
};

const handleDeleteClick = () => {
	setDeleteDialogOpen(true);
};

const handleDeleteConfirm = async () => {
	try {
		const apiUrl = import.meta.env.VITE_API_URL;
		const response = await fetch(
			`${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
			{
				method: 'DELETE',
				credentials: 'include',
			}
		);

		if (!response.ok) {
			throw new Error('Failed to delete message');
		}

		// Close dialog and notify parent
		setDeleteDialogOpen(false);
		onClose();
		if (onDelete) {
			onDelete();
		}
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to delete message');
		setDeleteDialogOpen(false);
	}
};

const handleDeleteCancel = () => {
	setDeleteDialogOpen(false);
};

const handleSendClick = async () => {
	if (!message) return;
	
	setSending(true);
	setError(null);
	setSendSuccess(null);
	
	try {
		// Parse recipients from message
		const toList = message.to?.split(',').map(e => e.trim()).filter(e => e.length > 0) || [];
		
		const apiUrl = import.meta.env.VITE_API_URL;
		const response = await fetch(`${apiUrl}/api/smtp/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({
				to: toList,
				subject: message.subject || '',
				body: parsedBody?.text || parsedBody?.html || '',
				cc: [],
				bcc: [],
			}),
		});
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || 'Failed to send email');
		}
		
		const data = await response.json();
		setSendSuccess(data.message || 'Email sent successfully');
		
		// Close dialog after short delay
		setTimeout(() => {
			onClose();
			if (onDelete) {
				onDelete(); // Refresh message list
			}
		}, 1500);
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to send email');
	} finally {
		setSending(false);
	}
};

const sanitizeHTML = (html: string): string => {
	// Configure DOMPurify to be strict
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'div', 'span',
			'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'blockquote', 'pre', 'code', 'table', 'thead', 'tbody',
			'tr', 'td', 'th', 'img'
		],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
		ALLOW_DATA_ATTR: false,
		// Remove all event handlers and javascript: URLs
		FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
		FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
	});
};

const renderMessageHeader = (
	message: MessageDetail,
	isDraft: boolean,
	sending: boolean,
	onSend: () => void,
	onDelete: () => void,
	onClose: () => void
) => (
	<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
		<Typography variant="h6" sx={{ flex: 1, pr: 2 }}>
			{message.subject || '(No Subject)'}
		</Typography>
		<Box sx={{ display: 'flex', gap: 1 }}>
			{isDraft && (
				<Button
					variant="contained"
					startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
					onClick={onSend}
					disabled={sending}
					size="small"
				>
					{sending ? 'Sending...' : 'Send'}
				</Button>
			)}
			<IconButton onClick={onDelete} size="small" color="error">
				<DeleteIcon />
			</IconButton>
			<IconButton onClick={onClose} size="small">
				<CloseIcon />
			</IconButton>
		</Box>
	</Box>
);

const renderMessageMetadata = (message: MessageDetail) => (
	<Stack spacing={0.5}>
		<Typography variant="body2">
			<strong>From:</strong> {message.from || 'Unknown'}
		</Typography>
		<Typography variant="body2">
			<strong>To:</strong> {message.to || 'Unknown'}
		</Typography>
		<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
			<Typography variant="body2" color="text.secondary">
				{message.date ? new Date(message.date).toLocaleString() : 'Unknown'}
			</Typography>
			{message.flags && message.flags.length > 0 && (
				<Stack direction="row" spacing={0.5}>
					{message.flags.map((flag) => (
						<Chip key={flag} label={flag} size="small" />
					))}
				</Stack>
			)}
		</Box>
	</Stack>
);

const renderMessageBody = (parsedBody: { html?: string; text?: string } | null) => {
	if (!parsedBody) {
		return <Typography>No message body</Typography>;
	}

	// Prefer HTML if available, otherwise show plain text
	if (parsedBody.html) {
		return <div dangerouslySetInnerHTML={{ __html: parsedBody.html }} />;
	}

	if (parsedBody.text) {
		return (
			<Box
				sx={{
					fontFamily: 'monospace',
					whiteSpace: 'pre-wrap',
				}}
			>
				{parsedBody.text}
			</Box>
		);
	}

	return <Typography>Unable to parse message body</Typography>;
};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '80vh' }}>
				{loading && (
					<Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
						<CircularProgress />
					</Box>
				)}

				{error && (
					<Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{sendSuccess && (
					<Alert severity="success" sx={{ m: 2 }} onClose={() => setSendSuccess(null)}>
						{sendSuccess}
					</Alert>
				)}

				{message && !loading && (
					<>
						{/* Compact header section */}
						<Box
							sx={{
								borderBottom: 1,
								borderColor: 'divider',
								p: 2,
								bgcolor: 'background.paper',
							}}
						>
						{renderMessageHeader(
							message,
							isDraft(),
							sending,
							handleSendClick,
							handleDeleteClick,
							onClose
						)}
						{renderMessageMetadata(message)}
					</Box>

					{/* Large body section */}
					<Box
						sx={{
							flex: 1,
							overflow: 'auto',
							p: 3,
							bgcolor: 'white',
						}}
					>
						{renderMessageBody(parsedBody)}
					</Box>
				</>
			)}
		</DialogContent>

		{/* Delete Confirmation Dialog */}
		<Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
			<DialogTitle>Delete Message</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Are you sure you want to delete this message? This action cannot be undone.
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleDeleteCancel}>Cancel</Button>
				<Button onClick={handleDeleteConfirm} color="error" variant="contained">
					Delete
				</Button>
			</DialogActions>
		</Dialog>
	</Dialog>
	);
}
