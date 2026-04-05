import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          
          <div className="prose prose-purple max-w-none">
            <p className="text-gray-600 mb-6">
              Last updated: January 2026
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing and using Influencia, you agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Influencia is an influencer marketing platform that connects brands with content creators for collaboration opportunities.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Creator Responsibilities</h2>
            <p className="text-gray-600 mb-4">
              As a creator, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide authentic social media metrics</li>
              <li>Complete campaign deliverables as agreed</li>
              <li>Disclose sponsored content as required by law</li>
              <li>Not engage in fraudulent activity (fake followers, engagement manipulation)</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Brand Responsibilities</h2>
            <p className="text-gray-600 mb-4">
              As a brand, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide clear campaign requirements</li>
              <li>Pay creators for completed work on time</li>
              <li>Respect creator content rights</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              Payment processing is handled through secure third-party providers. Platform fees may apply to transactions.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              Creators retain ownership of their content. By posting content for campaigns, creators grant brands limited usage rights as specified in campaign agreements.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Termination</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              Influencia is not responsible for disputes between brands and creators. We provide the platform; users are responsible for their agreements.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Contact</h2>
            <p className="text-gray-600 mb-4">
              For questions about these terms, contact us at: legal@influencia.app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
