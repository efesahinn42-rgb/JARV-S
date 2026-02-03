import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                jarvis: {
                    green: "#00ff41",
                    dark: "#0a0a0a",
                    neon: "#008F11",
                    glass: "rgba(0, 255, 65, 0.05)",
                },
            },
            fontFamily: {
                mono: ['Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", "monospace"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
};
export default config;
