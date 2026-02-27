
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname, "frontend"),
    base: "/portal/",
    build: {
        outDir: path.resolve(__dirname, "static/portal"),
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "frontend/src"),
            "@shared": path.resolve(__dirname, "shared"),
        },
    },
});
