import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

interface AuthCallbackProps {
	path: string;
}

export default function AuthCallback({ path }: AuthCallbackProps) {
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleCallback = async () => {
			try {
				// Check if there's an error parameter from the IdP
				const params = new URLSearchParams(window.location.search);
				const error = params.get('error');
				const errorDescription = params.get('error_description');

				if (error) {
					setError(`Authorization failed: ${errorDescription || error}`);
					setTimeout(() => route('/login'), 3000);
					return;
				}

				// The backend's /auth/callback endpoint has already handled:
				// 1. Exchanging the authorization code for tokens
				// 2. Validating the access token
				// 3. Storing the user in the database
				// 4. Creating an authenticated session
				// 5. Setting an HttpOnly session cookie
				// 6. Redirecting here
				
				// The browser now has the session cookie and we can redirect to the app
				// All subsequent API calls will automatically include the session cookie
				setTimeout(() => route('/mail'), 500);
			} catch (err) {
				console.error('OAuth callback error:', err);
				setError(err instanceof Error ? err.message : 'Authentication failed');
				setTimeout(() => route('/login'), 3000);
			}
		};

		handleCallback();
	}, []);

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				gap: 2,
			}}
		>
			{error ? (
				<>
					<Alert severity="error">{error}</Alert>
					<Typography variant="body2" color="text.secondary">
						Redirecting to login...
					</Typography>
				</>
			) : (
				<>
					<CircularProgress />
					<Typography variant="body1">
						Completing authentication...
					</Typography>
				</>
			)}
		</Box>
	);
}
