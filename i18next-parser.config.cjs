module.exports = {
    locales: ['en-US', 'pt-PT'],
    input: [
        'src/**/*.{ts,tsx}',
    ],
    yamlOptions: {
        lineWidth: -1,      // Unlimited line length
        noCompatMode: true, // Use modern YAML features
        // Add more yaml options if needed
    },
    output: 'src/locales/$LOCALE/translation.json',
    defaultNamespace: 'translation',
    keySeparator: false,
    namespaceSeparator: false
};