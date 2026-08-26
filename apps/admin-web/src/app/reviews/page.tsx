'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui';
import { api } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  customer: { email: string };
  fixer: { companyName: string };
  job: { id: string };
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get('/reviews/admin?limit=50');
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setReviews(list);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleToggle = async (reviewId: string, isHidden: boolean) => {
    try {
      await api.patch(`/reviews/admin/${reviewId}/${isHidden ? 'restore' : 'hide'}`);
      fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500 mt-1">Moderate customer reviews</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <DataTable headers={['Rating', 'Comment', 'Customer', 'Fixer', 'Date', 'Actions']}>
          {reviews.map((r) => (
            <tr key={r.id} className={`hover:bg-gray-50 ${r.isHidden ? 'opacity-50' : ''}`}>
              <td className="px-6 py-4 text-sm">
                <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                {r.comment || <span className="italic text-gray-400">No comment</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{r.customer?.email}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{r.fixer?.companyName}</td>
              <td className="px-6 py-4 text-sm text-gray-400">
                {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleToggle(r.id, r.isHidden)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    r.isHidden
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {r.isHidden ? 'Restore' : 'Hide'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
