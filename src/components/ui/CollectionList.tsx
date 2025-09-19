'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getCollectionsByYear } from '@/lib/queries/collections';
import { useStaggerAnimation } from '@/lib/animations';

type Collection = Awaited<ReturnType<typeof getCollectionsByYear>>[0];

interface CollectionListProps {
  collections: Collection[];
  yearLabel: string;
}

export function CollectionList({ collections, yearLabel }: CollectionListProps) {
  const gridRef = useStaggerAnimation({
    stagger: 0.15,
    delay: 0.3,
    duration: 0.8,
    y: 40
  });

  if (collections.length === 0) {
    return null;
  }

  return (
    <div 
      ref={gridRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" 
      data-testid="collections-grid"
    >
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/${encodeURIComponent(yearLabel)}/${encodeURIComponent(collection.slug)}`}
          className="group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded"
          data-testid="collection-card"
        >
          <article className="bg-white border border-gray-200 hover:border-gray-400 transition-all duration-300 group-hover:shadow-lg rounded overflow-hidden">
            {/* Cover image */}
            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
              {collection.cover_asset ? (
                <Image
                  src={`https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${collection.cover_asset.id}/cover`}
                  alt={collection.cover_asset.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {/* Placeholder camera icon */}
                  <div className="w-16 h-12 border-2 border-gray-300 rounded-sm relative">
                    <div className="w-8 h-8 bg-gray-300 rounded-full absolute -top-3 left-1/2 transform -translate-x-1/2"></div>
                    <div className="w-6 h-6 bg-white border border-gray-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>
              )}
              
              {/* Photo count overlay */}
              {collection._count.collection_assets > 0 && (
                <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                  {collection._count.collection_assets} {collection._count.collection_assets === 1 ? 'photo' : 'photos'}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h2 className="text-xl font-light text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                {collection.title}
              </h2>
              
              {collection.summary && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {collection.summary}
                </p>
              )}
              
              {/* Publication date */}
              {collection.published_at && (
                <time 
                  className="text-xs text-gray-400 mt-3 block"
                  dateTime={collection.published_at.toISOString()}
                >
                  {collection.published_at.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              )}
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}