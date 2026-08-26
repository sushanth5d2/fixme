'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/repair-requests/admin?limit=100');
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setAllRequests(list);
    } catch {
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === 'ALL') return allRequests;
    return allRequests.filter((r) => r.status === filter);
  }, [allRequests, filter]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Requests</h1>
          <p className="text-gray-500 mt-1">All live customer repair requests across the platform</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchRequests(); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs - Instant 0ms response */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'OPEN', 'QUOTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => {
          const count = s === 'ALL' ? allRequests.length : allRequests.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                filter === s ? 'bg-accent text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{s.replace(/_/g, ' ')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && allRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Loading requests...</div>
      ) : (
        <DataTable headers={['Device & Brand', 'Customer', 'Status', 'Urgency', 'Problem Description', 'Date Created']}>
          {filteredRequests.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No requests found in this tab</td></tr>
          ) : (
            filteredRequests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
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
