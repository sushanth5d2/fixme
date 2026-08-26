'use client';

import { useState, useEffect, useRef } from 'react';
import { DataTable } from '@/components/ui';
import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  iconKey?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newLogo, setNewLogo] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rowFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories?all=true');
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setCategories(list);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreateLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRowLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, catId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await api.patch(`/categories/${catId}`, { iconKey: base64 });
        fetchCategories();
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Failed to update logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/categories', {
        name: newName.trim(),
        iconKey: newLogo || undefined,
      });
      setNewName('');
      setNewLogo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Are you sure you want to permanently delete the category "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      await api.delete(`/categories/${cat.id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    try {
      await api.patch(`/categories/${cat.id}`, { isActive: !cat.isActive });
      fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update category status');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Categories</h1>
          <p className="text-gray-500 mt-1">Manage repair device categories, logos, and availability</p>
        </div>
        <button
          onClick={() => fetchCategories()}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Add New Category Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Add New Category</h2>
        <div className="flex flex-wrap items-center gap-4">
          {/* Logo preview / upload */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-accent flex items-center justify-center cursor-pointer bg-gray-50 overflow-hidden relative group"
              title="Click to upload category logo"
            >
              {newLogo ? (
                <img src={newLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl text-gray-400 group-hover:scale-110 transition-transform">📷</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCreateLogoUpload}
            />
            {newLogo && (
              <button
                type="button"
                onClick={() => { setNewLogo(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name (e.g., Drone, Smart Watch)"
            className="flex-1 min-w-[240px] px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />

          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light disabled:opacity-50 transition-colors shadow-sm"
          >
            {creating ? 'Adding...' : '+ Add Category'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Upload PNG, JPG, or SVG logos (up to 2MB). Slug will be generated automatically.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading categories...</div>
      ) : (
        <DataTable headers={['Logo', 'Category Name', 'Slug', 'Status', 'Created', 'Actions']}>
          {categories.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No categories found</td></tr>
          ) : (
            categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                {/* Logo Column */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => rowFileInputRefs.current[c.id]?.click()}
                      className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-accent overflow-hidden relative group shadow-2xs"
                      title="Click to upload/change logo"
                    >
                      {c.iconKey ? (
                        <img src={c.iconKey} alt={c.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg text-gray-400">📱</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                        ✏️
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { rowFileInputRefs.current[c.id] = el; }}
                      onChange={(e) => handleRowLogoUpload(e, c.id)}
                    />
                  </div>
                </td>

                <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{c.slug}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(c)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      c.isActive !== false ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Click to toggle active status"
                  >
                    {c.isActive !== false ? '● Active' : '○ Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => rowFileInputRefs.current[c.id]?.click()}
                      className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      {c.iconKey ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deletingId === c.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </div>
  );
}
