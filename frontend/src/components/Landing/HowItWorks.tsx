export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Create Your Profile',
      description: 'Sign up as a brand or creator and complete your profile with details, goals, and preferences.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'Get Matched',
      description: 'Our AI analyzes thousands of data points to match brands with perfect creators for their campaigns.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '03',
      title: 'Collaborate',
      description: 'Review briefs, negotiate terms, create content, and submit for approval—all in one platform.',
      color: 'from-orange-500 to-red-500',
    },
    {
      number: '04',
      title: 'Get Paid & Measure',
      description: 'Secure escrow payments and comprehensive analytics to measure campaign success and ROI.',
      color: 'from-green-500 to-emerald-500',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How SafarCollab Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Four simple steps to launch successful influencer campaigns
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${step.color} text-white font-bold text-2xl mb-4`}>
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -z-10"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
