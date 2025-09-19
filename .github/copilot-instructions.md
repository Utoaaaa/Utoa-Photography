# GitHub Copilot Instructions: Utoa Photography

## Project Overview
個人攝影作品展示網站，採用三層式年表導覽（首頁 → 年份 → 作品集），強調極簡留白美學搭配相機元素的幾何設計。

## Tech Stack
- **Framework**: Next.js 14 App Router + TypeScript 5.2+
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animation**: GSAP + Lenis smooth scrolling
- **Database**: Cloudflare D1 (SQLite) + Prisma ORM
- **Media**: Cloudflare Images with Direct Upload
- **Deployment**: Cloudflare Workers via OpenNext adapter
- **Testing**: Jest + React Testing Library + Playwright

## Architecture Patterns

### Route Groups Structure
```
app/
├── (site)/          # Public photography site
│   ├── page.tsx     # Homepage with year timeline
│   ├── [year]/      # Year page with collections
│   └── [year]/[collection]/ # Collection detail with photos
└── (admin)/         # Admin CMS protected by Cloudflare Access
    ├── years/       # Year management
    ├── collections/ # Collection management
    └── uploads/     # Direct upload workflow
```

### Data Model
- **Years**: Timeline containers with order_index for sorting
- **Collections**: Photo groups within years, with slug-based URLs  
- **Assets**: Cloudflare Images references with alt/caption
- **CollectionAssets**: Many-to-many with ordering for dot navigation

### Performance Strategy
- SSR + Edge caching with tag-based invalidation
- Lazy loading with Intersection Observer
- Multi-format images (AVIF/WebP) via Cloudflare variants
- Core Web Vitals targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1

## Coding Conventions

### Component Patterns
- Atomic design: UI components in `lib/ui/`
- Data fetching in dedicated query modules
- Separation of animation logic from rendering
- Progressive enhancement for no-JS scenarios

### Animation Guidelines
- Lenis for smooth scrolling site-wide
- GSAP for entrance animations and micro-interactions
- Respect `prefers-reduced-motion` with automatic fallbacks
- Dot navigation sync via Intersection Observer

### Accessibility Requirements
- Keyboard navigation for all interactive elements
- Focus management for year boxes, collections, dot nav
- Semantic HTML with proper heading hierarchy
- Alt text mandatory for all images
- ARIA labels for complex interactions

### Naming Conventions
- Database: snake_case (year_id, order_index)
- TypeScript: camelCase interfaces and functions
- Components: PascalCase with descriptive names
- CSS: Tailwind utilities with custom design tokens

### Error Handling
- API errors with structured ErrorResponse format
- Graceful degradation for media loading failures
- Retry mechanisms for Cloudflare Images upload
- Cache fallback strategies for edge cases

## Key Implementation Details

### Dot Navigation System
```typescript
// Photo viewer with synchronized dot navigation
const [activePhoto, setActivePhoto] = useState(0);
const photoRefs = useRef<HTMLElement[]>([]);

// Intersection Observer for scroll sync
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = photoRefs.current.indexOf(entry.target);
        setActivePhoto(index);
      }
    });
  },
  { threshold: 0.5 }
);
```

### Cache Strategy
```typescript
// Tag-based cache invalidation
export async function revalidateByTags(tags: string[]) {
  const response = await fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags })
  });
  return response.json();
}

// Usage: revalidateByTags(['years', 'collections:year:123'])
```

### Image Upload Flow
```typescript
// Direct upload to Cloudflare Images
const uploadAsset = async (file: File) => {
  // 1. Get signed upload URL
  const { upload_url, image_id } = await getDirectUploadToken(file.name);
  
  // 2. Upload directly to Cloudflare
  await uploadToCloudflare(upload_url, file);
  
  // 3. Save metadata to D1
  await createAssetRecord({ id: image_id, alt, caption });
};
```

## Recent Changes
- Phase 1 design completed: data model, API contracts, quickstart guide
- Constitutional conflicts documented: dynamic SSR vs static-first requirement
- Technical context finalized: Next.js + Cloudflare Workers stack
- Performance budgets set: Core Web Vitals targets and asset limits

## Notes for Copilot
- Prioritize accessibility and semantic HTML
- Always include loading states and error boundaries
- Use TypeScript strictly with proper interface definitions
- Follow responsive-first design with mobile considerations
- Implement proper SEO with structured data where applicable
- Consider prefers-reduced-motion in all animations
- Ensure admin routes are properly protected by Cloudflare Access