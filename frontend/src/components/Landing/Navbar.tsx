import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                SafarCollab
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-primary-600 font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 font-medium">
              How It Works
            </a>
            <a href="#testimonials" className="text-gray-700 hover:text-primary-600 font-medium">
              Testimonials
            </a>
            <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary">
              Get Started
            </Link>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-3">
            <a href="#features" className="block text-gray-700 hover:text-primary-600 font-medium">
              Features
            </a>
            <a href="#how-it-works" className="block text-gray-700 hover:text-primary-600 font-medium">
              How It Works
            </a>
            <a href="#testimonials" className="block text-gray-700 hover:text-primary-600 font-medium">
              Testimonials
            </a>
            <Link to="/login" className="block text-gray-700 hover:text-primary-600 font-medium">
              Sign In
            </Link>
            <Link to="/register" className="block btn-primary text-center">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
