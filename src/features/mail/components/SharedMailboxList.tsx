import { useTranslation } from 'react-i18next';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MailboxListItem from './MailboxListItem';
import { Mailbox } from '../data/mailboxes';
import {
    convertToNode,
    groupSharedMailboxesByAccount,
    MailboxNode,
    sortMailboxes,
} from '../utils/mailboxHelpers';

interface SharedMailboxListProps {
    sharedMailboxes: Mailbox[];
    selectedMailbox: string;
    expandedFolders: Set<string>;
    onMailboxSelect: (name: string, isLeaf: boolean) => void;
    onToggleFolder: (folderName: string) => void;
    onContextMenu: (event: MouseEvent, mailbox: MailboxNode) => void;
    onDrop: (e: DragEvent, targetMailboxId: string) => void;
    onDragOver: (e: DragEvent) => void;
}

export default function SharedMailboxList({
    sharedMailboxes,
    selectedMailbox,
    expandedFolders,
    onMailboxSelect,
    onToggleFolder,
    onContextMenu,
    onDrop,
    onDragOver,
}: SharedMailboxListProps) {
    const { t } = useTranslation();
    const groupedMailboxes = groupSharedMailboxesByAccount(sharedMailboxes);

    return (
        <List>
            {Object.entries(groupedMailboxes).map(
                ([accountId, { accountName, mailboxes: accountMailboxes }]) => {
                    const accountKey = `shared-${accountId}`;
                    const isAccountExpanded = expandedFolders.has(accountKey);

                    // Sort mailboxes within each shared account
                    const sortedMailboxNodes = sortMailboxes(accountMailboxes.map(convertToNode));

                    return (
                        <div key={accountKey}>
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => onToggleFolder(accountKey)}>
                                    <ListItemIcon>
                                        <FolderSharedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={accountName || t('mailSidebar.sharedMailboxes')}
                                    />
                                    {isAccountExpanded ? <ExpandLess /> : <ExpandMore />}
                                </ListItemButton>
                            </ListItem>
                            {isAccountExpanded && (
                                <Collapse in timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {sortedMailboxNodes.map((node) => (
                                            <MailboxListItem
                                                key={node.name}
                                                node={node}
                                                depth={1}
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
                        </div>
                    );
                }
            )}
        </List>
    );
}
