'use client';

import { useState, useEffect } from 'react';
import { DataTable, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

interface Request {
  id: string;
  description: string;
  status: string;
  priority: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  customer: { email: string; name?: string };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  OPEN: 'info',
  SEARCHING_FIXER: 'info',
  QUOTED: 'warning',
  CUSTOMER_ACCEPTED: 'success',
  ASSIGNED: 'success',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  REVIEWED: 'success',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === 'ALL' ? '/repair-requests/admin?limit=50' : `/repair-requests/admin?status=${filter}&limit=50`;
      const { data } = await api.get(url);
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Requests</h1>
          <p className="text-gray-500 mt-1">All live customer repair requests across the platform</p>
        </div>
        <button
          onClick={() => fetchRequests()}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'OPEN', 'QUOTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-accent text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading requests...</div>
      ) : (
        <DataTable headers={['Device & Brand', 'Customer', 'Status', 'Urgency', 'Problem Description', 'Date Created']}>
          {requests.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No requests found</td></tr>
          ) : (
            requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{r.category?.name || 'Device'}</p>
                  {(r.brand?.name || r.deviceModel) && (
                    <p className="text-xs text-gray-500">
                      {[r.brand?.name, r.deviceModel].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {r.customer?.name && <p className="font-medium text-gray-900">{r.customer.name}</p>}
                  <p className="text-xs text-gray-500">{r.customer?.email}</p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={r.status.replace(/_/g, ' ')} variant={STATUS_VARIANT[r.status] || 'default'} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.priority === 'HIGH' || r.priority === 'EMERGENCY' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {r.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{r.description}</td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </div>
  );
}
