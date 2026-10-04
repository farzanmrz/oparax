// The build lands in "build" (start-preview.py serves it locally; the Vercel project's Output Directory is "build").
const config = { distDir: "build", devIndicators: false, outputFileTracingRoot: process.cwd() };
export default config;
