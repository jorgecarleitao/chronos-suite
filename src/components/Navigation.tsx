import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const brandLabel = t('navigation.brandLabel');
    const languages = Object.keys(i18n.options.resources ?? {});

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('access_token');
            setIsAuthenticated(!!token);
        };

        checkAuth();

        // Listen for storage changes (e.g., logout in another tab)
        window.addEventListener('storage', checkAuth);

        // Check auth periodically to catch login/logout
        const interval = setInterval(checkAuth, 1000);

        return () => {
            window.removeEventListener('storage', checkAuth);
            clearInterval(interval);
        };
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');
        setIsAuthenticated(false);
        navigate('/login');
    };

    const navItems = isAuthenticated
        ? [
            { path: '/mail', label: t('navigation.mail') },
            { path: '/contacts', label: t('navigation.contacts') },
            { path: '/calendar', label: t('navigation.calendar') },
        ]
        : [{ path: '/login', label: t('navigation.login') }];

    const drawerContent = (
        <Box onClick={handleDrawerToggle} textAlign="center">
            <Box
                component={Link}
                to="/"
                marginY={2}
                display="block"
                style={{ textDecoration: 'none' }}
            >
                <img src="/icon.svg" alt="Logo" style={{ height: '40px', width: '40px' }} />
            </Box>
            <Divider />
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton component={Link} to={item.path}>
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
            <AppBar component="nav" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
                    <Box
                        component={Link}
                        to="/"
                        style={{ textDecoration: 'none', marginRight: '16px', display: 'flex', alignItems: 'center' }}
                    >
                        <img src="/icon.svg" alt="Logo" style={{ height: '40px', width: '40px' }} />
                    </Box>
                    {!isMobile && (
                        <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.path}
                                    component={Link}
                                    to={item.path}
                                    color="inherit"
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Stack>
                    )}
                    {isAuthenticated && (
                        <IconButton
                            onClick={handleLogout}
                            color="inherit"
                            title={t('navigation.logout')}
                        >
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
