import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { oauthService } from '../data/authService';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const { t } = useTranslation();
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
            setError(err instanceof Error ? err.message : t('login.loginFailed'));
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Stack marginTop={8} alignItems="center">
                <Card style={{ minWidth: 400 }}>
                    <CardContent>
                        <Typography variant="h5" component="h1" gutterBottom align="center">
                            {t('login.pleaseLogIn')}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                            align="center"
                            marginBottom={3}
                        >
                            {t('login.description')}
                        </Typography>

                        {error && (
                            <Alert severity="error" style={{ marginBottom: 16 }}>
                                {error}
                            </Alert>
                        )}

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleLogin();
                            }}
                        >
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                gutterBottom
                                marginBottom={2}
                            >
                                {t('login.instructions')}
                            </Typography>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                style={{ marginTop: 24, marginBottom: 16 }}
                                disabled={loading}
                            >
                                {loading ? t('login.buttonLoading') : t('login.loginWithOAuth')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Stack>
        </Container>
    );
}
