import { Link } from 'react-router-dom'
import Navbar from '../components/Landing/Navbar'
import Hero from '../components/Landing/Hero'
import Features from '../components/Landing/Features'
import HowItWorks from '../components/Landing/HowItWorks'
import Stats from '../components/Landing/Stats'
import Testimonials from '../components/Landing/Testimonials'
import Footer from '../components/Landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Influencer Marketing?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of brands and creators already using SafarCollab
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register" className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Get Started Free
            </Link>
            <Link to="/login" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
