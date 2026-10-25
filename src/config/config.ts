const apiUrl = {
    appName: 'PlayPass',
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4001/api/v1/',
    // The organizer app (event-web-app): host view and auction console live there.
    organizerAppUrl: import.meta.env.VITE_ORGANIZER_APP_URL || 'http://localhost:5175',
};

export default apiUrl;
