'use client';

import { useEffect, useState } from 'react';

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/diag/db-test')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading diagnostics...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Diagnostics</h1>
      
      <div className="space-y-4">
        <Section title="Environment">
          <Info label="Node ENV" value={data?.nodeEnv} />
          <Info label="Runtime" value={data?.runtime} />
          <Info label="Timestamp" value={data?.timestamp} />
        </Section>

        <Section title="Cloudflare Environment">
          <Info label="Available" value={data?.cloudflareEnv?.available ? '✅' : '❌'} />
          <Info label="Has DB" value={data?.cloudflareEnv?.hasDB ? '✅' : '❌'} />
          <Info label="Has Uploads" value={data?.cloudflareEnv?.hasUploads ? '✅' : '❌'} />
        </Section>

        <Section title="D1 Direct Test">
          <Info label="Success" value={data?.d1Test?.success ? '✅' : '❌'} />
          {data?.d1Test?.error && <Info label="Error" value={data.d1Test.error} />}
          {data?.d1Test?.result && <Info label="Result" value={JSON.stringify(data.d1Test.result)} />}
        </Section>

        <Section title="Years Table">
          <Info label="Count" value={JSON.stringify(data?.yearsCount)} />
          {data?.sampleYears && (
            <div className="mt-2">
              <p className="font-semibold">Sample Years:</p>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(data.sampleYears, null, 2)}
              </pre>
            </div>
          )}
        </Section>

        <Section title="Prisma Test">
          <Info label="Year Count" value={data?.prismaYearCount} />
          {data?.prismaTest?.error && (
            <div className="mt-2 text-red-600">
              <p className="font-semibold">Error:</p>
              <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-auto">
                {data.prismaTest.error}
              </pre>
            </div>
          )}
          {data?.prismaSampleYears && (
            <div className="mt-2">
              <p className="font-semibold">Sample Years via Prisma:</p>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(data.prismaSampleYears, null, 2)}
              </pre>
            </div>
          )}
        </Section>

        {data?.error && (
          <Section title="General Error">
            <pre className="p-2 bg-red-50 rounded text-xs overflow-auto text-red-600">
              {data.error}
            </pre>
            {data.stack && (
              <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto text-red-600">
                {data.stack}
              </pre>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium">{label}:</span>
      <span className="font-mono text-sm">{String(value)}</span>
    </div>
  );
}
