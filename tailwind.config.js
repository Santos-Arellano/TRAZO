/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0E1417",
          800: "#111A1E",
          700: "#151D22",
          600: "#1B262C",
          500: "#26333B",
          400: "#33454E",
        },
        signal: "#E8A33D",
        signal2: "#4CC2FF",
        mist: "#C8D3D5",
        muted: "#7C8B90",
        good: "#5CC8B8",
        bad: "#E5687A",
      },
      fontFamily: {
        mono: ["ui-monospace", "SF Mono", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
