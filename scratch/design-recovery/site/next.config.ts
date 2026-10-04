// The local preview keeps its build in "build" (start-preview.py serves it); Vercel expects ".next".
const config = { distDir: process.env.VERCEL ? ".next" : "build", devIndicators: false, outputFileTracingRoot: process.cwd() };
export default config;
