import { useState, type ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

type WindowMode = 'minimized' | 'normal' | 'maximized';

interface ExpandableWindowProps {
    title: string | ReactNode;
    children: ReactNode;
    onClose: () => void;
    defaultWidth?: number;
    defaultHeight?: number;
    headerColor?: string;
    headerActions?: ReactNode;
}

export default function ExpandableWindow({
    title,
    children,
    onClose,
    defaultWidth = 600,
    defaultHeight = 600,
    headerColor = 'primary.main',
    headerActions,
}: ExpandableWindowProps) {
    const [mode, setMode] = useState<WindowMode>('normal');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Toggle between normal and maximized
    const toggleMaximize = () => {
        setMode((current) => (current === 'maximized' ? 'normal' : 'maximized'));
    };

    // Toggle minimize
    const toggleMinimize = () => {
        setMode((current) => (current === 'minimized' ? 'normal' : 'minimized'));
    };

    // Calculate styles based on mode
    const getWindowStyles = () => {
        const baseStyles = {
            position: 'fixed' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            zIndex: 1300,
            overflow: 'hidden',
            borderRadius: mode === 'maximized' || isMobile ? 0 : 2,
            transition: 'all 0.3s ease-in-out',
        };

        // On mobile, always use full screen
        if (isMobile) {
            return {
                ...baseStyles,
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                width: '100vw',
                height: '100vh',
            };
        }

        switch (mode) {
            case 'minimized':
                return {
                    ...baseStyles,
                    bottom: 16,
                    right: 16,
                    width: isTablet ? '90vw' : Math.min(defaultWidth, window.innerWidth - 32),
                    height: 'auto',
                };
            case 'maximized':
                return {
                    ...baseStyles,
                    bottom: 0,
                    right: 0,
                    width: '100vw',
                    height: '100vh',
                };
            case 'normal':
            default:
                return {
                    ...baseStyles,
                    bottom: 16,
                    right: 16,
                    width: isTablet ? '90vw' : Math.min(defaultWidth, window.innerWidth - 32),
                    height: isTablet ? '80vh' : Math.min(defaultHeight, window.innerHeight - 32),
                };
        }
    };

    return (
        <Paper elevation={8} sx={getWindowStyles()}>
            {/* Header */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                bgcolor={headerColor}
                color="primary.contrastText"
                px={2}
                py={1}
                sx={{
                    userSelect: 'none',
                }}
                onClick={() => mode === 'minimized' && toggleMinimize()}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                        {title}
                    </Typography>
                    {headerActions}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMinimize();
                        }}
                        size="small"
                        color="inherit"
                        title={mode === 'minimized' ? 'Restore' : 'Minimize'}
                    >
                        {mode === 'minimized' ? (
                            <MaximizeIcon fontSize="small" />
                        ) : (
                            <MinimizeIcon fontSize="small" />
                        )}
                    </IconButton>
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMaximize();
                        }}
                        size="small"
                        color="inherit"
                        title={mode === 'maximized' ? 'Exit fullscreen' : 'Maximize'}
                    >
                        {mode === 'maximized' ? (
                            <FullscreenExitIcon fontSize="small" />
                        ) : (
                            <FullscreenIcon fontSize="small" />
                        )}
                    </IconButton>
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        size="small"
                        color="inherit"
                        title="Close"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Stack>

            {/* Content */}
            <Collapse in={mode !== 'minimized'} timeout="auto" unmountOnExit>
                <Stack
                    sx={{
                        height:
                            mode === 'maximized' || isMobile
                                ? 'calc(100vh - 48px)'
                                : isTablet
                                    ? 'calc(80vh - 48px)'
                                    : `${defaultHeight - 48}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                    }}
                >
                    {children}
                </Stack>
            </Collapse>
        </Paper>
    );
}
