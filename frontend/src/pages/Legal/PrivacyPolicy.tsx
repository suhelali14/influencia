import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-purple max-w-none">
            <p className="text-gray-600 mb-6">
              Last updated: January 2026
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">
              Influencia collects information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Account information (name, email, password)</li>
              <li>Profile information (bio, profile picture, social media handles)</li>
              <li>Social media data when you connect your accounts (followers, engagement metrics)</li>
              <li>Campaign and collaboration data</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Match creators with brands for collaboration opportunities</li>
              <li>Analyze platform usage and trends</li>
              <li>Communicate with you about campaigns and updates</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Social Media Integration</h2>
            <p className="text-gray-600 mb-4">
              When you connect your social media accounts (Instagram, YouTube, TikTok), we access:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Basic profile information (username, profile picture)</li>
              <li>Follower counts and engagement metrics</li>
              <li>Public content for analytics purposes</li>
            </ul>
            <p className="text-gray-600 mb-4">
              You can disconnect your social media accounts at any time from your dashboard.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Sharing</h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Brands (only public profile data when you apply for campaigns)</li>
              <li>Service providers who help us operate the platform</li>
              <li>Legal authorities when required by law</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures including encryption, secure token storage, and regular security audits.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Disconnect social media accounts</li>
              <li>Export your data</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              For privacy-related questions, contact us at: privacy@influencia.app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
