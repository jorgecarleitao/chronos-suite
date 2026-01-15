import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { oauthService } from '../data/authService';
import { jmapService } from '../data/jmapClient';

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
                const errorParam = params.get('error');
                const errorDescription = params.get('error_description');

                if (errorParam) {
                    setError(`Authorization failed: ${errorDescription || errorParam}`);
                    setTimeout(() => route('/login'), 3000);
                    return;
                }

                // Handle OAuth callback - exchanges code for tokens
                await oauthService.handleCallback(window.location.href);

                // Get access token and initialize JMAP client
                const accessToken = oauthService.getAccessToken();
                if (!accessToken) {
                    throw new Error('No access token received');
                }

                await jmapService.initialize(accessToken);

                // Redirect to mail page
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
        <Stack alignItems="center" justifyContent="center" minHeight="100vh" spacing={2}>
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
                    <Typography variant="body1">Completing authentication...</Typography>
                </>
            )}
        </Stack>
    );
}
