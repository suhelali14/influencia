import { TrendingUp, Users, DollarSign, Zap } from 'lucide-react'

export default function Stats() {
  const stats = [
    { icon: Users, value: '10K+', label: 'Active Creators' },
    { icon: TrendingUp, value: '500+', label: 'Brands' },
    { icon: DollarSign, value: '$5M+', label: 'Paid to Creators' },
    { icon: Zap, value: '50K+', label: 'Campaigns Launched' },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
