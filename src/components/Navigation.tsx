import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useTranslation } from 'react-i18next';
import locale from 'locale-code';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

interface NavigationProps {
    mode: 'light' | 'dark';
    toggleTheme: () => void;
}

export default function Navigation({ mode, toggleTheme }: NavigationProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const brandLabel = 'Mail Client';
    const languages = Object.keys(i18n.options.resources ?? {});

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        route('/login');
    };

    const navItems = isAuthenticated
        ? [{ path: '/mail', label: 'Mail' }]
        : [{ path: '/login', label: 'Login' }];

    const drawerContent = (
        <Box onClick={handleDrawerToggle} textAlign="center">
            <Typography
                variant="h6"
                component="a"
                href="/"
                marginY={2}
                display="block"
                color="inherit"
                style={{ textDecoration: 'none' }}
            >
                {brandLabel}
            </Typography>
            <Divider />
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton component="a" href={item.path}>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{ textAlign: 'center' }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <>
            <AppBar component="nav">
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                    {!isMobile && (
                        <Typography
                            variant="h6"
                            component="a"
                            href="/"
                            flexGrow={1}
                            color="inherit"
                            style={{ textDecoration: 'none' }}
                        >
                            {brandLabel}
                        </Typography>
                    )}
                    {!isMobile && (
                        <Stack direction="row" spacing={1}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.path}
                                    component="a"
                                    href={item.path}
                                    color="inherit"
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Stack>
                    )}
                    {isAuthenticated && (
                        <IconButton onClick={handleLogout} color="inherit" title="Logout">
                            <LogoutIcon />
                        </IconButton>
                    )}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton onClick={toggleTheme} color="inherit">
                            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                        <Select
                            variant="standard"
                            value={i18n.language}
                            onChange={(e) =>
                                i18n.changeLanguage((e.target as HTMLInputElement).value)
                            }
                            style={{ color: 'inherit' }}
                        >
                            {languages.map((lang) => (
                                <MenuItem key={lang} value={lang}>
                                    {locale.getLanguageNativeName(lang)}
                                </MenuItem>
                            ))}
                        </Select>
                    </Stack>
                </Toolbar>
            </AppBar>
            <nav>
                {isMobile && (
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                            keepMounted: true,
                        }}
                        PaperProps={{
                            style: { boxSizing: 'border-box', width: drawerWidth },
                        }}
                    >
                        {drawerContent}
                    </Drawer>
                )}
            </nav>
        </>
    );
}
