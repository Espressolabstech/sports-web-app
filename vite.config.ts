import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@league': path.resolve(__dirname, './src/league'),
            '@app-assets': path.resolve(__dirname, './src/assets'),
        },
    },
    server: {
        allowedHosts: ['player.getbook.xyz'],
    },
});
