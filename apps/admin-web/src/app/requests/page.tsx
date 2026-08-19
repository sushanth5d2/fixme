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
  customer: { email: string };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  OPEN: 'info', QUOTED: 'warning', CUSTOMER_ACCEPTED: 'success', ASSIGNED: 'success',
  COMPLETED: 'success', CANCELLED: 'error', REVIEWED: 'success',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/repair-requests/admin?limit=50').then(({ data }) => {
      setRequests(data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repair Requests</h1>
        <p className="text-gray-500 mt-1">All repair requests across the platform</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <DataTable headers={['Device', 'Customer', 'Status', 'Priority', 'Description', 'Date']}>
          {requests.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No requests found</td></tr>
          ) : (
            requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{r.category?.name}</p>
                  {r.deviceModel && <p className="text-xs text-gray-500">{r.deviceModel}</p>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.customer?.email}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={r.status.replace(/_/g, ' ')} variant={STATUS_VARIANT[r.status] || 'default'} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.priority}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{r.description}</td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </div>
  );
}
