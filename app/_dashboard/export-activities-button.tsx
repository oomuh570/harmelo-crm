'use client';
import { Download } from 'lucide-react';
import { useState } from 'react';

export default function ExportActivitiesButton({
  compact = false,
}: {
  compact?: boolean;
} = {}) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/exports/activities');
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        'activities.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export activities');
    } finally {
      setLoading(false);
    }
  }

  const sizing = compact ? 'px-2 py-1 text-xs gap-1' : 'px-4 py-2 text-sm font-medium gap-1.5';
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center rounded-md border border-gray-700 bg-[#07090F] text-gray-200 hover:border-gray-500 disabled:opacity-50 cursor-pointer ${sizing}`}
    >
      <Download className={iconSize} />
      {loading ? 'Exporting...' : compact ? 'Export' : 'Export activities'}
    </button>
  );
}
