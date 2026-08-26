'use client';

import { useState, useEffect, useMemo } from 'react';
import { DataTable, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

interface Fixer {
  id: string;
  companyName: string;
  ownerName: string;
  gstin?: string | null;
  panNumber?: string | null;
  businessRegNo?: string | null;
  addressLine?: string;
  city: string;
  state: string;
  pincode?: string;
  experienceYears?: number;
  description?: string;
  profilePhotoKey?: string | null;
  workshopPhotos?: string[];
  verificationStatus: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  DOCUMENT_SUBMITTED: 'info',
  REGISTERED: 'info',
  VERIFIED: 'success',
  APPROVED: 'success',
  REJECTED: 'error',
  SUSPENDED: 'error',
};

export default function FixersPage() {
  const [allFixers, setAllFixers] = useState<Fixer[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFixers = async () => {
    try {
      const { data } = await api.get('/fixers/admin?limit=100');
      const raw = data?.data?.data ?? data?.data ?? data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(data?.data) ? data.data : [];
      setAllFixers(list);
    } catch (err) {
      console.warn('[Fixers fetch error]', err);
      setAllFixers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFixers();
    const interval = setInterval(fetchFixers, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredFixers = useMemo(() => {
    if (filter === 'ALL') return allFixers;
    return allFixers.filter((f) => {
      if (filter === 'UNDER_REVIEW') {
        return f.verificationStatus === 'UNDER_REVIEW' || f.verificationStatus === 'DOCUMENT_SUBMITTED' || f.verificationStatus === 'REGISTERED';
      }
      return f.verificationStatus === filter;
    });
  }, [allFixers, filter]);

  const handleAction = async (fixerId: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    try {
      await api.patch(`/fixers/admin/${fixerId}/verify`, { action: status, status, adminNotes: `${action}d by admin` });
      if (selectedFixer?.id === fixerId) {
        setSelectedFixer(null);
      }
      fetchFixers();
    } catch (err: any) {
      alert(err?.response?.data?.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixer Verification & KYC</h1>
          <p className="text-gray-500 mt-1">Review and approve workshop applications</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchFixers(); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs - Instant 0ms response */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'UNDER_REVIEW', 'VERIFIED', 'REGISTERED', 'REJECTED'].map((s) => {
          const count = s === 'ALL'
            ? allFixers.length
            : s === 'UNDER_REVIEW'
            ? allFixers.filter((f) => f.verificationStatus === 'UNDER_REVIEW' || f.verificationStatus === 'DOCUMENT_SUBMITTED' || f.verificationStatus === 'REGISTERED').length
            : allFixers.filter((f) => f.verificationStatus === s).length;
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

      {loading && allFixers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Loading fixers...</div>
      ) : (
        <DataTable headers={['Company / Workshop', 'Proprietor', 'GSTIN / PAN', 'Location', 'Status', 'Registered', 'Actions']}>
          {filteredFixers.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-gray-400">No fixers found in this tab</td>
            </tr>
          ) : (
            filteredFixers.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{f.companyName}</p>
                  {f.experienceYears && <p className="text-xs text-gray-500">{f.experienceYears} yrs experience</p>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.ownerName}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                  <div>GST: {f.gstin || '—'}</div>
                  {f.panNumber && <div className="text-xs text-gray-400">PAN: {f.panNumber}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <p>{f.city}, {f.state}</p>
                  {f.pincode && <p className="text-xs text-gray-400 font-mono">Pin: {f.pincode}</p>}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={f.verificationStatus.replace(/_/g, ' ')} variant={STATUS_VARIANT[f.verificationStatus] || 'default'} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFixer(f)}
                      className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      View Details
                    </button>
                    {f.verificationStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleAction(f.id, 'approve')}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {f.verificationStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleAction(f.id, 'reject')}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}

      {/* Details Modal */}
      {selectedFixer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedFixer.companyName}</h2>
                <p className="text-sm text-gray-500">Proprietor: {selectedFixer.ownerName}</p>
              </div>
              <button
                onClick={() => setSelectedFixer(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500 block">GSTIN</span>
                  <span className="font-mono font-medium text-gray-900">{selectedFixer.gstin || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">PAN Number</span>
                  <span className="font-mono font-medium text-gray-900">{selectedFixer.panNumber || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Trade / MSME Reg No</span>
                  <span className="font-mono font-medium text-gray-900">{selectedFixer.businessRegNo || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Experience</span>
                  <span className="font-medium text-gray-900">{selectedFixer.experienceYears || 1} Years</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 block mb-1">Workshop Address</span>
                <p className="p-3 bg-gray-50 rounded-lg text-gray-800">
                  {[selectedFixer.addressLine, selectedFixer.city, selectedFixer.state, selectedFixer.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              {selectedFixer.description && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">About / Bio</span>
                  <p className="p-3 bg-gray-50 rounded-lg text-gray-800">{selectedFixer.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedFixer(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => handleAction(selectedFixer.id, 'reject')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Reject Application
              </button>
              <button
                onClick={() => handleAction(selectedFixer.id, 'approve')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Verify & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
