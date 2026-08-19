import { StatCard } from '@/components/ui';

// In a real app, these would come from API calls
const MOCK_STATS = {
  totalCustomers: 1_247,
  totalFixers: 342,
  pendingVerifications: 18,
  openRequests: 89,
  activeJobs: 156,
  completedToday: 23,
  openComplaints: 7,
  revenue: '₹4,82,350',
};

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your Fix Me platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Customers" value={MOCK_STATS.totalCustomers.toLocaleString()} icon="👥" change="+12%" changeType="up" />
        <StatCard title="Verified Fixers" value={MOCK_STATS.totalFixers} icon="🔧" change="+8%" changeType="up" />
        <StatCard title="Active Jobs" value={MOCK_STATS.activeJobs} icon="⚡" change="+5%" changeType="up" />
        <StatCard title="Completed Today" value={MOCK_STATS.completedToday} icon="✅" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Open Requests" value={MOCK_STATS.openRequests} icon="📋" />
        <StatCard title="Pending Verifications" value={MOCK_STATS.pendingVerifications} icon="⏳" change="Action needed" changeType="down" />
        <StatCard title="Open Complaints" value={MOCK_STATS.openComplaints} icon="⚠️" change="Action needed" changeType="down" />
        <StatCard title="Revenue (Month)" value={MOCK_STATS.revenue} icon="💰" change="+15%" changeType="up" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/fixers" className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Review Verifications</p>
              <p className="text-sm text-gray-500">{MOCK_STATS.pendingVerifications} pending</p>
            </div>
          </a>
          <a href="/complaints" className="flex items-center gap-3 p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-gray-900">Handle Complaints</p>
              <p className="text-sm text-gray-500">{MOCK_STATS.openComplaints} open</p>
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
