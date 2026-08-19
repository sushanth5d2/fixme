'use client';

import { useState, useEffect } from 'react';
import { DataTable, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

interface Fixer {
  id: string;
  companyName: string;
  ownerName: string;
  gstin: string;
  city: string;
  state: string;
  verificationStatus: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  SUSPENDED: 'error',
};

export default function FixersPage() {
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  const fetchFixers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/fixers/admin?status=${filter}&limit=50`);
      setFixers(data.data || []);
    } catch {
      setFixers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFixers(); }, [filter]);

  const handleAction = async (fixerId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    try {
      await api.patch(`/fixers/admin/${fixerId}/verify`, { status, adminNotes: `${action}d by admin` });
      fetchFixers();
    } catch (err: any) {
      alert(err?.response?.data?.message || `Failed to ${action}`);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixer Verification</h1>
          <p className="text-gray-500 mt-1">Review and approve fixer registrations</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
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
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <DataTable headers={['Company', 'Owner', 'GSTIN', 'Location', 'Status', 'Registered', 'Actions']}>
          {fixers.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-gray-400">No fixers found</td>
            </tr>
          ) : (
            fixers.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{f.companyName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.ownerName}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{f.gstin || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.city}, {f.state}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={f.verificationStatus} variant={STATUS_VARIANT[f.verificationStatus] || 'default'} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {(f.verificationStatus === 'PENDING' || f.verificationStatus === 'UNDER_REVIEW') && (
                      <>
                        <button
                          onClick={() => handleAction(f.id, 'approve')}
                          className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(f.id, 'reject')}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
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
