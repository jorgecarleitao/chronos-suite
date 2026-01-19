import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import DraftsIcon from '@mui/icons-material/Drafts';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import FolderIcon from '@mui/icons-material/Folder';
import { MailboxNode } from '../utils/mailboxHelpers';

interface MailboxListItemProps {
    node: MailboxNode;
    depth?: number;
    selectedMailbox: string;
    expandedFolders: Set<string>;
    onMailboxSelect: (name: string, isLeaf: boolean) => void;
    onToggleFolder: (folderName: string) => void;
    onContextMenu: (event: MouseEvent, mailbox: MailboxNode) => void;
    onDrop: (e: DragEvent, targetMailboxId: string) => void;
    onDragOver: (e: DragEvent) => void;
}

const getMailboxIcon = (role?: string) => {
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

export default function MailboxListItem({
    node,
    depth = 0,
    selectedMailbox,
    expandedFolders,
    onMailboxSelect,
    onToggleFolder,
    onContextMenu,
    onDrop,
    onDragOver,
}: MailboxListItemProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.name);

    const handleClick = () => {
        if (hasChildren) {
            onToggleFolder(node.name);
        }
        if (node.isLeaf) {
            onMailboxSelect(node.name, node.isLeaf);
        }
    };

    const primaryText =
        node.role === 'inbox' && node.unreadEmails
            ? `${node.displayName} (${node.unreadEmails})`
            : node.displayName;

    return (
        <>
            <ListItem
                disablePadding
                secondaryAction={
                    !node.role && (
                        <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onContextMenu(e as any, node);
                            }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    )
                }
            >
                <ListItemButton
                    selected={selectedMailbox === node.name && node.isLeaf}
                    onClick={handleClick}
                    onContextMenu={(e) => !node.role && onContextMenu(e as any, node)}
                    onDrop={(e) => node.id && onDrop(e as any, node.id)}
                    onDragOver={onDragOver as any}
                    style={{ paddingLeft: (2 + depth * 2) * 8 }}
                >
                    <ListItemIcon>{getMailboxIcon(node.role)}</ListItemIcon>
                    <ListItemText
                        primary={primaryText}
                        primaryTypographyProps={{
                            fontWeight: node.role === 'inbox' ? 'bold' : 'normal',
                        }}
                    />
                    {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
            </ListItem>

            {hasChildren && isExpanded && (
                <Collapse in timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {node.children.map((child) => (
                            <MailboxListItem
                                key={child.name}
                                node={child}
                                depth={depth + 1}
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
                </Collapse>
            )}
        </>
    );
}
