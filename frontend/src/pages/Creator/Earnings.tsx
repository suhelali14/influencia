import { useEffect } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { DollarSign, TrendingUp, Download } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchMyCreatorProfile } from '../../store/slices/creatorsSlice'
import { fetchCreatorPayments, fetchCreatorEarnings } from '../../store/slices/paymentsSlice'

export default function CreatorEarnings() {
  const dispatch = useAppDispatch()
  const { currentCreator } = useAppSelector((state) => state.creators)
  const { payments, earnings, loading } = useAppSelector((state) => state.payments)

  useEffect(() => {
    dispatch(fetchMyCreatorProfile())
  }, [dispatch])

  useEffect(() => {
    if (currentCreator?.id) {
      dispatch(fetchCreatorPayments(currentCreator.id))
      dispatch(fetchCreatorEarnings(currentCreator.id))
    }
  }, [dispatch, currentCreator?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-600 mt-2">Track your income and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-green-600">All time</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${earnings?.total ? Number(earnings.total).toFixed(2) : '0.00'}
          </div>
          <div className="text-sm text-gray-600">Total Earnings</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${earnings?.completed ? Number(earnings.completed).toFixed(2) : '0.00'}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${earnings?.pending ? Number(earnings.pending).toFixed(2) : '0.00'}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          <button className="btn-outline text-sm flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading payments...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campaign ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Gateway</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-mono text-sm text-gray-900">
                      {payment.campaign_id.slice(0, 8)}...
                    </td>
                    <td className="py-4 px-4 text-gray-700 font-semibold">
                      ${Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-gray-600 capitalize">{payment.payment_type}</td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-gray-600 capitalize">
                      {payment.payment_gateway || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No payment transactions yet</p>
            <p className="text-sm mt-2">Complete campaigns to start earning</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
