/**
 * Admin publish endpoint re-exporting publishing guard logic.
 * Ensures admin namespace uses same publish guard implementation (T021).
 */
import type { NextRequest } from 'next/server';

import { POST as publishingPost } from '@/app/api/publishing/collections/[collection_id]/publish/route';

type AdminPublishContext = {
	params: Promise<{ collectionId: string }>;
};

type PublishingContext = {
	params: Promise<{ collection_id: string }>;
};

export function POST(request: NextRequest, context: AdminPublishContext) {
	const mappedContext: PublishingContext = {
		params: context.params.then(({ collectionId }) => ({ collection_id: collectionId }))
	};

	return publishingPost(request, mappedContext);
}
