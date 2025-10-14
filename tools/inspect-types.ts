import type { POST as AssignCollectionLocationPost } from '@/app/api/admin/collections/[collectionId]/location/route';

type AssignCollectionContext = Parameters<typeof AssignCollectionLocationPost>[1];

type ExpectPromiseParams = { params: Promise<{ collectionId: string }> };

type ExpectPromiseContext = Promise<ExpectPromiseParams>;

type ExpectSyncParams = { params: { collectionId: string } };

type _Check1 = AssignCollectionContext extends ExpectPromiseContext ? true : false;

type _Check2 = ExpectPromiseContext extends AssignCollectionContext ? true : false;

type _Check3 = AssignCollectionContext extends ExpectSyncParams ? true : false;

type _Check4 = ExpectSyncParams extends AssignCollectionContext ? true : false;

const _assert1: ExpectPromiseContext = null as unknown as AssignCollectionContext;
const _assert2: AssignCollectionContext = null as unknown as ExpectPromiseContext;
const _assert3: ExpectSyncParams = null as unknown as AssignCollectionContext;
const _assert4: AssignCollectionContext = null as unknown as ExpectSyncParams;
