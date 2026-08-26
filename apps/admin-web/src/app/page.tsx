'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/ui';
import { api } from '@/lib/api';

interface DashboardStats {
  totalCustomers: number;
  totalFixers: number;
  pendingVerifications: number;
  openRequests: number;
  activeJobs: number;
  completedToday: number;
  openComplaints: number;
  revenue: string;
  revenueNumber?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalFixers: 0,
    pendingVerifications: 0,
    openRequests: 0,
    activeJobs: 0,
    completedToday: 0,
    openComplaints: 0,
    revenue: '₹0',
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      const payload = data?.data || data || {};
      setStats({
        totalCustomers: Number(payload.totalCustomers) || 0,
        totalFixers: Number(payload.totalFixers) || 0,
        pendingVerifications: Number(payload.pendingVerifications) || 0,
        openRequests: Number(payload.openRequests) || 0,
        activeJobs: Number(payload.activeJobs) || 0,
        completedToday: Number(payload.completedToday) || 0,
        openComplaints: Number(payload.openComplaints) || 0,
        revenue: payload.revenue || `₹${(Number(payload.revenueNumber) || 0).toLocaleString('en-IN')}`,
      });
    } catch (err) {
      console.warn('[Admin Dashboard Stats Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Live overview from database</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString('en-IN')}
          icon="👥"
        />
        <StatCard
          title="Verified Fixers"
          value={stats.totalFixers.toLocaleString('en-IN')}
          icon="🔧"
        />
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs.toLocaleString('en-IN')}
          icon="⚡"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday.toLocaleString('en-IN')}
          icon="✅"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Open Requests"
          value={stats.openRequests.toLocaleString('en-IN')}
          icon="📋"
        />
        <StatCard
          title="Pending Verifications"
          value={stats.pendingVerifications.toLocaleString('en-IN')}
          icon="⏳"
          change={stats.pendingVerifications > 0 ? `${stats.pendingVerifications} Action needed` : undefined}
          changeType={stats.pendingVerifications > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="Open Complaints"
          value={stats.openComplaints.toLocaleString('en-IN')}
          icon="⚠️"
          change={stats.openComplaints > 0 ? `${stats.openComplaints} Action needed` : undefined}
          changeType={stats.openComplaints > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="Revenue (Month)"
          value={stats.revenue}
          icon="💰"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/fixers" className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Review Verifications</p>
              <p className="text-sm text-gray-500">{stats.pendingVerifications} pending</p>
            </div>
          </a>
          <a href="/complaints" className="flex items-center gap-3 p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-gray-900">Handle Complaints</p>
              <p className="text-sm text-gray-500">{stats.openComplaints} open</p>
            </div>
          </a>
          <a href="/categories" className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-medium text-gray-900">Manage Categories</p>
              <p className="text-sm text-gray-500">Add or edit device types</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
