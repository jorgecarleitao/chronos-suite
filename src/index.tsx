import { useMemo, useState, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@mui/material/styles';
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

const LoadingFallback = () => (
    <Stack justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
    </Stack>
);

function App() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

    // Auto-initialize JMAP client if we have a valid token
    useEffect(() => {
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
    }, []);

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

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <BrowserRouter>
                <Box>
                    <Navigation mode={mode} toggleTheme={toggleTheme} />
                    <Box component="main">
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/auth/callback" element={<AuthCallback />} />
                                <Route path="/mail" element={<MailPage />} />
                                <Route path="/contacts" element={<ContactsPage />} />
                                <Route path="/calendar" element={<CalendarPage />} />
                                <Route path="/" element={<Navigate to="/login" replace />} />
                            </Routes>
                        </Suspense>
                    </Box>
                </Box>
            </BrowserRouter>
        </ThemeProvider>
    );
}

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
