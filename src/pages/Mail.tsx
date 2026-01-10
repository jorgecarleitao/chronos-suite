import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
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
import FolderIcon from '@mui/icons-material/Folder';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';

import MessageList from '../components/MessageList';
import ComposeEmail from '../components/ComposeEmail';

const drawerWidth = 240;

interface MailProps {
	path: string;
}

interface Mailbox {
	name: string;
	display_name: string;
	attributes: string[];
	is_selectable: boolean;
	children: Mailbox[];
}

interface MailboxNode {
	name: string; // Full path name
	displayName: string; // Just the last segment
	children: MailboxNode[];
	isLeaf: boolean;
}

// Convert backend tree to frontend node structure (if needed for compatibility)
const convertToNode = (mailbox: Mailbox): MailboxNode => ({
	name: mailbox.name,
	displayName: mailbox.display_name,
	children: mailbox.children.map(convertToNode),
	isLeaf: mailbox.is_selectable,
});

export default function Mail({ path }: MailProps) {
	const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
	const [selectedMailbox, setSelectedMailbox] = useState<string>('INBOX');
	const [loading, setLoading] = useState(true);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['INBOX']));
	const [composeOpen, setComposeOpen] = useState(false);

	useEffect(() => {
		// Check authentication will be handled by the backend
		// If session cookie is invalid, API calls will return 401
		loadMailboxes();
	}, []);

	const loadMailboxes = async () => {
		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			
			const response = await fetch(`${apiUrl}/api/imap/mailboxes`, {
				credentials: 'include', // Include HttpOnly session cookie
			});

			if (!response.ok) {
				if (response.status === 401) {
					// Session expired or invalid, redirect to login
					route('/login');
					return;
				}
				throw new Error('Failed to load mailboxes');
			}

			const data = await response.json();
			setMailboxes(data.mailboxes || []);
		} catch (error) {
			console.error('Failed to load mailboxes:', error);
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

	const renderMailboxNode = (node: MailboxNode, depth: number = 0): JSX.Element[] => {
		const hasChildren = node.children.length > 0;
		const isExpanded = expandedFolders.has(node.name);
		const elements: JSX.Element[] = [];

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
					sx={{ pl: 2 + depth * 2 }}
				>
					<ListItemIcon>
						{getMailboxIcon(node.name)}
					</ListItemIcon>
					<ListItemText primary={node.displayName} />
					{hasChildren && (
						isExpanded ? <ExpandLess /> : <ExpandMore />
					)}
				</ListItemButton>
			</ListItem>
		);

		// Render children if expanded
		if (hasChildren && isExpanded) {
			elements.push(
				<Collapse key={`${node.name}-collapse`} in={isExpanded} timeout="auto" unmountOnExit>
					<List component="div" disablePadding>
						{node.children.map((child) => renderMailboxNode(child, depth + 1))}
					</List>
				</Collapse>
			);
		}

		return elements;
	};

	// Convert backend tree structure to frontend nodes
	const mailboxTree = mailboxes.map(convertToNode);

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

	const getMailboxIcon = (name: string) => {
		const lowerName = name.toLowerCase();
		if (lowerName === 'inbox') return <InboxIcon />;
		if (lowerName === 'sent' || lowerName.includes('sent')) return <SendIcon />;
		if (lowerName === 'drafts' || lowerName.includes('draft')) return <DraftsIcon />;
		if (lowerName === 'trash' || lowerName.includes('trash') || lowerName.includes('deleted')) return <DeleteIcon />;
		return <FolderIcon />;
	};

	return (
		<Box sx={{ display: 'flex', height: '100vh' }}>
			{/* Mailbox sidebar */}
			<Drawer
				variant="permanent"
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
				<Box sx={{ overflow: 'auto' }}>
					<Typography variant="h6" sx={{ p: 2 }}>
						Mailboxes
					</Typography>
					<Divider />
					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
							<CircularProgress />
						</Box>
					) : (
						<List>
							{mailboxTree.map((node) => renderMailboxNode(node))}
						</List>
					)}
				</Box>
			</Drawer>

			{/* Message list area */}
			<Box component="main" sx={{ flexGrow: 1, p: 3, position: 'relative' }}>
				<Toolbar />
				<Paper sx={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
					{selectedMailbox && isActualMailbox ? (
						<MessageList mailbox={selectedMailbox} />
					) : (
						<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
							<Typography color="text.secondary">
								{selectedMailbox ? 'This is a folder. Select a mailbox to view messages.' : 'Select a mailbox to view messages'}
							</Typography>
						</Box>
					)}
				</Paper>

				{/* Floating compose button */}
				<Fab
					color="primary"
					aria-label="compose"
					onClick={() => setComposeOpen(true)}
					sx={{
						position: 'fixed',
						bottom: 32,
						right: 32,
					}}
				>
					<EditIcon />
				</Fab>
			</Box>

			{/* Compose email drawer */}
			<ComposeEmail open={composeOpen} onClose={() => setComposeOpen(false)} />
		</Box>
	);
}
