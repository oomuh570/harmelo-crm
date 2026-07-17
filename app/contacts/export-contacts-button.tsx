'use client';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { FilterState } from './contacts-filter';

interface ExportContactsButtonProps {
  search?: string;
  filters?: FilterState;
}

export default function ExportContactsButton({
  search = '',
  filters,
}: ExportContactsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters?.categories.length) params.set('type', filters.categories.join(','));
      if (filters?.tags.length) params.set('tagIds', filters.tags.join(','));

      const res = await fetch(`/api/exports/contacts?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        'contacts.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export contacts');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-[#07090F] px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50 cursor-pointer"
    >
      <Download className="h-4 w-4" />
      {loading ? 'Exporting...' : 'Export'}
    </button>
  );
}
