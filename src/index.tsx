
import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import Router from 'preact-router';

import { createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

import Navigation from './components/Navigation';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Mail from './pages/Mail';

import './i18n';

export default function App() {
	const { t, i18n } = useTranslation();
	const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
	const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

	const theme = useMemo(
		() =>
			createTheme({
				palette: {
					mode: mode,
				},
			}),
		[mode],
	);

	const toggleTheme = () => {
		setMode(theme.palette.mode === 'dark' ? 'light' : 'dark');
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline enableColorScheme />
			<Box>
				<Navigation mode={mode} toggleTheme={toggleTheme} />
				<Box component="main">
					<Router>
						<Login path="/login" />
						<AuthCallback path="/auth/callback" />
						<Mail path="/mail" />
						<Login path="/" default />
					</Router>
				</Box>
			</Box>
		</ThemeProvider>
	);
}

render(<App />, document.getElementById('app')!);
