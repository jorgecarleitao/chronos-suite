import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { oauthService } from '../data/authService';

interface LoginProps {
	path: string;
}

export default function Login({ path }: LoginProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleLogin = async () => {
		setLoading(true);
		setError(null);

		try {
			// Start OAuth PKCE flow - will redirect to authorization server
			await oauthService.login();
		} catch (err) {
			console.error('Login error:', err);
			setError(err instanceof Error ? err.message : 'Failed to initiate login');
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="sm">
			<Stack marginTop={8} alignItems="center">
				<Card style={{ minWidth: 400 }}>
					<CardContent>
						<Typography variant="h5" component="h1" gutterBottom align="center">
							Mail Client Login
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom align="center" marginBottom={3}>
							Sign in to access your email
						</Typography>

						{error && (
							<Alert severity="error" style={{ marginBottom: 16 }}>
								{error}
							</Alert>
						)}

						<Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
							<Typography variant="body2" color="text.secondary" gutterBottom marginBottom={2}>
								Click the button below to sign in using your OAuth2 identity provider.
							</Typography>

							<Button
								type="submit"
								fullWidth
								variant="contained"
								style={{ marginTop: 24, marginBottom: 16 }}
								disabled={loading}
							>
								{loading ? 'Redirecting to login...' : 'Sign In with OAuth2'}
							</Button>
						</Box>
					</CardContent>
				</Card>
			</Stack>
		</Container>
	);
}
