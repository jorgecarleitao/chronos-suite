import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';

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
			const apiUrl = import.meta.env.VITE_API_URL;
			const nextUrl = encodeURIComponent(window.location.origin + '/mail');
			
			// Simply navigate to the backend login endpoint with the next URL
			// Backend will redirect to IdP, then back to callback, then to the next URL
			window.location.href = `${apiUrl}/auth/login?next=${nextUrl}`;
		} catch (err) {
			console.error('Login error:', err);
			setError(err instanceof Error ? err.message : 'Failed to initiate login');
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="sm">
			<Box
				sx={{
					marginTop: 8,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<Card sx={{ minWidth: 400 }}>
					<CardContent>
						<Typography variant="h5" component="h1" gutterBottom align="center">
							Mail Client Login
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom align="center" sx={{ mb: 3 }}>
							Sign in to access your email
						</Typography>

						{error && (
							<Alert severity="error" sx={{ mb: 2 }}>
								{error}
							</Alert>
						)}

						<Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
							<Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
								Click the button below to sign in using your OAuth2 identity provider.
							</Typography>

							<Button
								type="submit"
								fullWidth
								variant="contained"
								sx={{ mt: 3, mb: 2 }}
								disabled={loading}
							>
								{loading ? 'Redirecting to login...' : 'Sign In with OAuth2'}
							</Button>
						</Box>
					</CardContent>
				</Card>
			</Box>
		</Container>
	);
}
