'use client';

import { useState, useEffect, useMemo } from 'react';
import { DataTable, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

interface Complaint {
  id: string;
  reason: string;
  description: string;
  status: string;
  adminNotes: string | null;
  resolution: string | null;
  complainant: { email: string };
  respondent: { email: string };
  job: { id: string };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  OPEN: 'error',
  UNDER_REVIEW: 'info',
  WAITING_FOR_INFORMATION: 'warning',
  RESOLVED: 'success',
  REJECTED: 'default' as any,
  CLOSED: 'default' as any,
};

export default function ComplaintsPage() {
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');

  const fetchComplaints = async () => {
    try {
      const { data } = await api.get('/complaints/admin?limit=100');
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setAllComplaints(list);
    } catch { setAllComplaints([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchComplaints();
    const interval = setInterval(fetchComplaints, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredComplaints = useMemo(() => {
    if (filter === 'ALL') return allComplaints;
    return allComplaints.filter((c) => c.status === filter);
  }, [allComplaints, filter]);

  const handleUpdate = async (complaintId: string, status: string) => {
    try {
      await api.patch(`/complaints/admin/${complaintId}`, {
        status,
        adminNotes: adminNotes || undefined,
        resolution: resolution || undefined,
      });
      setSelectedId(null);
      setAdminNotes('');
      setResolution('');
      fetchComplaints();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints & Disputes</h1>
          <p className="text-gray-500 mt-1">Manage and resolve customer/fixer disputes</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchComplaints(); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs - Instant 0ms response */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION', 'RESOLVED', 'REJECTED'].map((s) => {
          const count = s === 'ALL' ? allComplaints.length : allComplaints.filter((c) => c.status === s).length;
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

      {loading && allComplaints.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Loading complaints...</div>
      ) : (
        <DataTable headers={['Reason', 'Complainant', 'Respondent', 'Status', 'Date', 'Actions']}>
          {filteredComplaints.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No complaints found in this tab</td></tr>
          ) : (
            filteredComplaints.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{c.reason.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.complainant?.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.respondent?.email}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} variant={STATUS_VARIANT[c.status] || 'default'} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-6 py-4">
                  {selectedId === c.id ? (
                    <div className="space-y-2 min-w-[200px]">
                      <textarea
                        placeholder="Admin notes..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                        rows={2}
                      />
                      <textarea
                        placeholder="Resolution..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                        rows={2}
                      />
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => handleUpdate(c.id, 'UNDER_REVIEW')} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Review</button>
                        <button onClick={() => handleUpdate(c.id, 'RESOLVED')} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Resolve</button>
                        <button onClick={() => handleUpdate(c.id, 'REJECTED')} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Reject</button>
                        <button onClick={() => setSelectedId(null)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      Manage
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </div>
  );
}
