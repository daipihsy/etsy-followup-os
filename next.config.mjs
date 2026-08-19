/**
 * Next.js config for static export to GitHub Pages.
 *
 * GitHub Pages "project sites" are served from https://<user>.github.io/<repo>/,
 * so the app must be built with a basePath equal to "/<repo>".
 * We read it from an env var so you can override it without editing code:
 *
 *   NEXT_PUBLIC_BASE_PATH=/etsy-followup-os npm run build
 *
 * The GitHub Actions workflow in .github/workflows/deploy.yml sets this
 * automatically from the repository name. For local dev / user sites
 * (https://<user>.github.io) leave it empty.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
