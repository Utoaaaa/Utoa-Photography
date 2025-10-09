import { getAllYears } from '@/lib/queries/years';
import { getAllCollections } from '@/lib/queries/collections';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';

export default async function AdminDashboard() {
  try {
    const [years, collections] = await Promise.all([
      getAllYears(),
      getAllCollections()
    ]);
    
  const publishedYears = years.filter((year) => year.status === 'published');
  const draftYears = years.filter((year) => year.status === 'draft');
  const publishedCollections = collections.filter((collection) => collection.status === 'published');
  const draftCollections = collections.filter((collection) => collection.status === 'draft');
    
    return (
      <AdminDashboardContent
        publishedYears={publishedYears.length}
        draftYears={draftYears.length}
        publishedCollections={publishedCollections.length}
        draftCollections={draftCollections.length}
      />
    );
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    
    return (
      <AdminDashboardContent
        publishedYears={0}
        draftYears={0}
        publishedCollections={0}
        draftCollections={0}
        hasError
      />
    );
  }
}
