import { render } from 'preact';
import { useMemo, useState, Suspense } from 'preact/compat';
import { useTranslation } from 'react-i18next';
import Router from 'preact-router';

import { createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import Navigation from './components/Navigation';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import { MailPage } from './features/mail';
import { ContactsPage } from './features/contacts';
import { CalendarPage } from './features/calendar';
import { oauthService } from './data/authService';
import { jmapClient } from './data/jmapClient';

import './i18n';

// Auto-initialize JMAP client if we have a valid token
const initializeFromStorage = async () => {
    const accessToken = oauthService.getAccessToken();
    if (accessToken && !oauthService.isTokenExpired()) {
        try {
            await jmapClient.initialize(accessToken);
        } catch (error) {
            console.error('Failed to initialize JMAP client:', error);
            oauthService.logout();
        }
    }
};

initializeFromStorage();

export default function App() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: mode,
                },
            }),
        [mode]
    );

    const toggleTheme = () => {
        setMode(theme.palette.mode === 'dark' ? 'light' : 'dark');
    };

    const LoadingFallback = () => (
        <Stack justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress size={60} />
        </Stack>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <Box>
                <Navigation mode={mode} toggleTheme={toggleTheme} />
                <Box component="main">
                    <Suspense fallback={<LoadingFallback />}>
                        <Router>
                            <Login path="/login" />
                            <AuthCallback path="/auth/callback" />
                            <MailPage path="/mail" />
                            <ContactsPage path="/contacts" />
                            <CalendarPage path="/calendar" />
                            <Login path="/" />
                        </Router>
                    </Suspense>
                </Box>
            </Box>
        </ThemeProvider>
    );
}

render(<App />, document.getElementById('app')!);
