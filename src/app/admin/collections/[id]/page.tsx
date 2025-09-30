"use client";

import { useParams } from 'next/navigation';
import ManagePhotosClient from '../ManagePhotosClient';

// Force dynamic to avoid static path generation attempts during dev/E2E
export const dynamic = 'force-dynamic';

export default function ManagePhotosPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string | undefined) || '';
  return <ManagePhotosClient id={id} />;
}
