# Publishing Tool (Private)

This is a private publishing tool for managing drafts, previews, SEO/OG settings, and publishing workflow for the Utoa Photography website.

## Scope and Separation

This tool is **separate from the public site** and maintains the static-first architecture:

- **Public Site**: Pure static generation from `src/app/(site)/` - no dependencies on this tool
- **Private Tool**: Handles content management, preview, and triggers static site rebuilds
- **Deployment**: This tool can run as CLI or private Worker, never exposed to public users

## Architecture

- **Input**: Draft collections with assets, metadata, SEO settings
- **Processing**: Validation, version management, audit logging
- **Output**: Triggers static site rebuild + CDN invalidation

## Usage

```bash
# Install dependencies
cd tools/publishing
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Constitutional Compliance

This private tool is an acceptable deviation from Constitution I (Static-First) because:
1. Public site remains purely static
2. Tool is never exposed to end users
3. Provides essential content management capabilities
4. Alternative (pure Git CMS) provides poor UX for image management

See `/specs/002-title-publishing-why/plan.md` for detailed rationale.