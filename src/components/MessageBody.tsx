import { useEffect, useRef } from 'preact/hooks';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import DOMPurify from 'dompurify';

interface MessageBodyProps {
    htmlBody?: string;
    textBody?: string;
}

export default function MessageBody({ htmlBody, textBody }: MessageBodyProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Sanitize HTML content
    const sanitizeHTML = (html: string): string => {
        return DOMPurify.sanitize(html, {
            FORBID_TAGS: [
                'script',
                'style',
                'iframe',
                'object',
                'embed',
                'applet',
                'link',
                'base',
                'meta',
                'form',
                'input',
                'button',
                'textarea',
                'select',
            ],
            FORBID_ATTR: [
                'onerror',
                'onload',
                'onclick',
                'onmouseover',
                'onmouseout',
                'onfocus',
                'onblur',
                'onchange',
                'onsubmit',
                'onkeydown',
                'onkeyup',
                'onkeypress',
                'formaction',
                'action',
            ],
            ADD_ATTR: ['target'],
        });
    };

    // Update iframe content
    useEffect(() => {
        if (iframeRef.current && htmlBody) {
            const iframe = iframeRef.current;
            const sanitizedHTML = sanitizeHTML(htmlBody);

            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                    font-size: 14px;
                                    line-height: 1.6;
                                    margin: 16px;
                                    color: #333;
                                }
                                img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                a {
                                    color: #1976d2;
                                    text-decoration: none;
                                }
                                a:hover {
                                    text-decoration: underline;
                                }
                            </style>
                        </head>
                        <body>${sanitizedHTML}</body>
                    </html>
                `);
                doc.close();

                // Adjust iframe height to fit content
                const resizeIframe = () => {
                    if (doc.body) {
                        iframe.style.height = doc.body.scrollHeight + 32 + 'px';
                    }
                };

                // Initial resize and setup observer
                setTimeout(resizeIframe, 100);
                const observer = new MutationObserver(resizeIframe);
                observer.observe(doc.body, { childList: true, subtree: true, attributes: true });

                return () => observer.disconnect();
            }
        }
    }, [htmlBody]);

    if (htmlBody) {
        return (
            <Paper sx={{ p: 0, overflow: 'hidden' }}>
                <iframe
                    ref={iframeRef}
                    title="Email Content"
                    sandbox="allow-same-origin"
                    style={{
                        width: '100%',
                        border: 'none',
                        minHeight: '200px',
                    }}
                />
            </Paper>
        );
    }

    if (textBody) {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography
                    variant="body1"
                    component="pre"
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                >
                    {textBody}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
                No content available
            </Typography>
        </Paper>
    );
}
