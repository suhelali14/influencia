import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Lifestyle Creator',
      avatar: '👩‍💼',
      rating: 5,
      text: 'SafarCollab has completely transformed how I work with brands. The AI recommendations are spot-on, and I\'ve increased my earnings by 3x!',
    },
    {
      name: 'Michael Chen',
      role: 'Marketing Director, TechCorp',
      avatar: '👨‍💼',
      rating: 5,
      text: 'Finding the right influencers used to take weeks. Now it takes minutes. The ROI tracking and automated workflows are game-changers.',
    },
    {
      name: 'Priya Sharma',
      role: 'Fashion Influencer',
      avatar: '👩‍🎨',
      rating: 5,
      text: 'The platform makes it so easy to manage multiple campaigns. Plus, the secure payment system gives me peace of mind.',
    },
  ]

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Loved by Brands and Creators
          </h2>
          <p className="text-xl text-gray-600">
            See what our community has to say
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center">
                <div className="text-4xl mr-4">{testimonial.avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
