import { useState } from 'preact/hooks';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import AttachFileIcon from '@mui/icons-material/AttachFile';

import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from "rehype-sanitize";

const drawerWidth = 600;

interface ComposeEmailProps {
	open: boolean;
	onClose: () => void;
	mailbox?: string;
}

export default function ComposeEmail({ open, onClose, mailbox = 'Drafts' }: ComposeEmailProps) {
	const [to, setTo] = useState('');
	const [cc, setCc] = useState('');
	const [bcc, setBcc] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [showCc, setShowCc] = useState(false);
	const [showBcc, setShowBcc] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const parseEmailList = (emails: string): string[] => {
		return emails
			.split(/[,;]/)
			.map(e => e.trim())
			.filter(e => e.length > 0);
	};

	const handleSaveDraft = async () => {
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			
			const response = await fetch(`${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					to: parseEmailList(to),
					subject,
					body,
					cc: showCc ? parseEmailList(cc) : [],
					bcc: showBcc ? parseEmailList(bcc) : [],
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to save draft');
			}

			const data = await response.json();
			setSuccess(data.message || 'Draft saved successfully');
			
			// Clear form after successful save
			setTimeout(() => {
				handleClear();
				onClose();
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save draft');
		} finally {
			setSaving(false);
		}
	};

	const handleClear = () => {
		setTo('');
		setCc('');
		setBcc('');
		setSubject('');
		setBody('');
		setShowCc(false);
		setShowBcc(false);
		setError(null);
		setSuccess(null);
	};

	const handleImageUpload = async (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const base64 = reader.result as string;
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const handlePaste = async (event: ClipboardEvent) => {
		const items = event.clipboardData?.items;
		if (!items) return;

		for (const item of Array.from(items)) {
			if (item.type.startsWith('image/')) {
				event.preventDefault();
				const file = item.getAsFile();
				if (file) {
					try {
						const base64 = await handleImageUpload(file);
						const imageMarkdown = `![image](${base64})`;
						setBody((prev) => prev + '\n' + imageMarkdown);
					} catch (err) {
						setError('Failed to upload image');
					}
				}
			}
		}
	};

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			sx={{
				width: drawerWidth,
				flexShrink: 0,
				[`& .MuiDrawer-paper`]: {
					width: drawerWidth,
					boxSizing: 'border-box',
				},
			}}
		>
			<Toolbar />
			<Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
				{/* Header */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
					<Typography variant="h6">New Message</Typography>
					<IconButton onClick={onClose} size="small">
						<CloseIcon />
					</IconButton>
				</Box>

				{/* Success/Error messages */}
				{success && (
					<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
						{success}
					</Alert>
				)}
				{error && (
					<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{/* Form */}
				<Stack spacing={2} sx={{ flex: 1, overflow: 'auto' }}>
					<TextField
						label="To"
						variant="outlined"
						size="small"
						fullWidth
						value={to}
						onChange={(e) => setTo((e.target as HTMLInputElement).value)}
						required
						helperText="Separate multiple addresses with commas or semicolons"
					/>

					<Box sx={{ display: 'flex', gap: 1 }}>
						<Button size="small" onClick={() => setShowCc(!showCc)}>
							{showCc ? 'Remove Cc' : 'Add Cc'}
						</Button>
						<Button size="small" onClick={() => setShowBcc(!showBcc)}>
							{showBcc ? 'Remove Bcc' : 'Add Bcc'}
						</Button>
					</Box>

					{showCc && (
						<TextField
							label="Cc"
							variant="outlined"
							size="small"
							fullWidth
							value={cc}
							onChange={(e) => setCc((e.target as HTMLInputElement).value)}
							helperText="Separate multiple addresses with commas or semicolons"
						/>
					)}

					{showBcc && (
						<TextField
							label="Bcc"
							variant="outlined"
							size="small"
							fullWidth
							value={bcc}
							onChange={(e) => setBcc((e.target as HTMLInputElement).value)}
							helperText="Separate multiple addresses with commas or semicolons"
						/>
					)}

					<TextField
						label="Subject"
						variant="outlined"
						size="small"
						fullWidth
						value={subject}
						onChange={(e) => setSubject((e.target as HTMLInputElement).value)}
						required
					/>

					{/* Markdown Editor */}
					<Box sx={{ flex: 1, minHeight: '300px' }}>
						<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
							Body (Markdown supported - paste images directly)
						</Typography>
						<div data-color-mode="light" onPaste={handlePaste}>
							<MDEditor
								value={body}
								onChange={(val) => setBody(val || '')}
								height={400}
								previewOptions={{
									rehypePlugins: [[rehypeSanitize]],
								}}
							/>
						</div>
					</Box>
				</Stack>

				{/* Actions */}
				<Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
					<Button
						variant="contained"
						startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
						onClick={handleSaveDraft}
						disabled={saving}
						fullWidth
					>
						Save Draft
					</Button>
					<Button
						variant="outlined"
						onClick={handleClear}
						disabled={saving}
					>
						Clear
					</Button>
				</Box>
			</Box>
		</Drawer>
	);
}
