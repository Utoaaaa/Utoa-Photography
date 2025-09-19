import Link from 'next/link';
import { getAllYears } from '@/lib/queries/years';
import { getAllCollections } from '@/lib/queries/collections';

export default async function AdminDashboard() {
  try {
    const [years, collections] = await Promise.all([
      getAllYears(),
      getAllCollections()
    ]);
    
    const publishedYears = years.filter((y: any) => y.status === 'published');
    const draftYears = years.filter((y: any) => y.status === 'draft');
    const publishedCollections = collections.filter((c: any) => c.status === 'published');
    const draftCollections = collections.filter((c: any) => c.status === 'draft');
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your photography portfolio content
            </p>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Published Years
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {publishedYears.length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Draft Years
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {draftYears.length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Published Collections
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {publishedCollections.length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Draft Collections
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {draftCollections.length}
              </p>
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Years Management
              </h3>
              <p className="text-gray-600 mb-4">
                Create and organize timeline years for your photography collections.
              </p>
              <Link
                href="/admin/years"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Manage Years
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Collections Management
              </h3>
              <p className="text-gray-600 mb-4">
                Create photo collections and organize them within years.
              </p>
              <Link
                href="/admin/collections"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Manage Collections
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Image Uploads
              </h3>
              <p className="text-gray-600 mb-4">
                Upload new photos and manage existing assets in your collections.
              </p>
              <Link
                href="/admin/uploads"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Upload Images
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
            <p className="text-gray-600 mb-8">Welcome to UTOA Photography Admin</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link
                href="/admin/years"
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Years</h3>
                <p className="text-gray-600">Manage timeline years</p>
              </Link>
              
              <Link
                href="/admin/collections"
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Collections</h3>
                <p className="text-gray-600">Manage photo collections</p>
              </Link>
              
              <Link
                href="/admin/uploads"
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Uploads</h3>
                <p className="text-gray-600">Upload new images</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}