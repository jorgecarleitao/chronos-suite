import { useState, useEffect } from 'preact/hooks';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import MailIcon from '@mui/icons-material/Mail';
import DraftsIcon from '@mui/icons-material/Drafts';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';

interface Message {
	uid: number;
	sequence: number;
	flags: string[];
	size?: number;
	from_name?: string;
	from_email?: string;
	to_name?: string;
	to_email?: string;
	subject?: string;
	date?: string;
}

interface MessageListProps {
	mailbox: string;
}

export default function MessageList({ mailbox }: MessageListProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedMessage, setSelectedMessage] = useState<number | null>(null);

	useEffect(() => {
		loadMessages();
	}, [mailbox]);

	const loadMessages = async () => {
		setLoading(true);
		setError(null);

		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			
			const response = await fetch(
				`${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages?limit=50`,
				{
					credentials: 'include', // Include HttpOnly session cookie
				}
			);

			if (!response.ok) {
				throw new Error('Failed to load messages');
			}

			const data = await response.json();
			setMessages(data.messages || []);
			setTotal(data.total || 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	};

	const isUnread = (flags: string[]) => {
		return !flags.some(flag => flag === 'Seen');
	};

	const isFlagged = (flags: string[]) => {
		return flags.some(flag => flag === 'Flagged');
	};

	const isDraft = (flags: string[]) => {
		return flags.some(flag => flag === 'Draft');
	};

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '';
		try {
			const date = new Date(dateStr);
			// Check if date is valid
			if (isNaN(date.getTime())) {
				return '';
			}
			const now = new Date();
			const isToday = date.toDateString() === now.toDateString();
			
			if (isToday) {
				return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			}
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	if (messages.length === 0) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
				<Typography color="text.secondary">
					No messages in this mailbox
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
				<Typography variant="h6">
					{mailbox}
					<Chip label={`${total} messages`} size="small" sx={{ ml: 2 }} />
				</Typography>
			</Box>
			<List sx={{ flexGrow: 1, overflow: 'auto' }}>
				{messages.map((message) => {
					const displayName = message.from_name || message.from_email || 'Unknown Sender';
					const formattedDate = formatDate(message.date);
					const unread = isUnread(message.flags);
					const flagged = isFlagged(message.flags);
					const draft = isDraft(message.flags);
					
					return (
					<ListItem key={message.uid} disablePadding divider>
						<ListItemButton
							selected={selectedMessage === message.uid}
							onClick={() => setSelectedMessage(message.uid)}
							sx={{ userSelect: 'text' }}
						>
							<Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
								{unread ? (
									<MailIcon sx={{ color: 'primary.main', fontSize: 20 }} />
								) : (
									<DraftsIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
								)}
							</Box>
							{flagged && (
								<Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
									<StarIcon sx={{ color: 'warning.main', fontSize: 20 }} />
								</Box>
							)}
							{draft && (
								<Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
									<Chip label="Draft" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
								</Box>
							)}
							<ListItemText
								primary={
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'text' }}>
										<Typography
											component="span"
											variant="body1"
											sx={{
												fontWeight: unread ? 'bold' : 'normal',
												flexGrow: 1,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
												userSelect: 'text',
											}}
										>
											{displayName}
										</Typography>
										<Typography
											component="span"
											variant="caption"
											color="text.secondary"
											sx={{ ml: 2, flexShrink: 0, userSelect: 'text' }}
										>
											{formattedDate}
										</Typography>
									</Box>
								}
								secondary={
									<Typography
										component="span"
										variant="body2"
										color="text.secondary"
										sx={{
											fontWeight: unread ? 'bold' : 'normal',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											display: 'block',
											userSelect: 'text',
										}}
									>
										{message.subject || '(No subject)'}
									</Typography>
								}
							/>
						</ListItemButton>
					</ListItem>
					);
				})}
			</List>
		</Box>
	);
}
