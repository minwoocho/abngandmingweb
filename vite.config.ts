import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative URLs also work under GitHub Pages' /abngandmingweb/ subpath.
export default defineConfig({ base: './', plugins: [react()] });
