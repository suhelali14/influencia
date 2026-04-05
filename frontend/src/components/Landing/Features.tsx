import { Sparkles, Target, BarChart, Shield, Zap, Users } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Matching',
      description: 'Intelligent algorithm matches brands with ideal creators based on audience, engagement, and campaign goals.',
    },
    {
      icon: Target,
      title: 'Smart Recommendations',
      description: 'Creators get AI-driven insights on which campaigns to accept for maximum ROI and brand alignment.',
    },
    {
      icon: BarChart,
      title: 'Real-Time Analytics',
      description: 'Track campaign performance, engagement metrics, and ROI with comprehensive dashboards.',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Escrow system ensures safe transactions with support for Razorpay and Stripe integrations.',
    },
    {
      icon: Zap,
      title: 'Automated Workflows',
      description: 'From brief creation to content approval and payment, automate your entire campaign lifecycle.',
    },
    {
      icon: Users,
      title: 'Social Integration',
      description: 'Connect Instagram, YouTube, and TikTok accounts to sync metrics and content automatically.',
    },
  ]

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need for Successful Campaigns
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to streamline influencer marketing for both brands and creators
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
