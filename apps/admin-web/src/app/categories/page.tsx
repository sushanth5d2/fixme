'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui';
import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/categories', { name: newName.trim() });
      setNewName('');
      fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Device Categories</h1>
        <p className="text-gray-500 mt-1">Manage repair device categories</p>
      </div>

      {/* Add New */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name (e.g., Smart Watch)"
          className="flex-1 max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light disabled:opacity-50 transition-colors"
        >
          {creating ? 'Adding...' : 'Add Category'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <DataTable headers={['Name', 'Slug', 'Status', 'Created']}>
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500 font-mono">{c.slug}</td>
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-400">
                {new Date(c.createdAt).toLocaleDateString('en-IN')}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
