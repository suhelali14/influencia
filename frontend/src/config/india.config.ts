/**
 * India Market Configuration for Frontend
 * Regional settings, languages, platforms, and UI customizations
 */

export const INDIA_CONFIG = {
  // Regional Languages
  languages: [
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  ],

  // Major Cities
  cities: [
    { value: 'mumbai', label: 'Mumbai', state: 'Maharashtra' },
    { value: 'delhi', label: 'Delhi', state: 'Delhi' },
    { value: 'bangalore', label: 'Bangalore', state: 'Karnataka' },
    { value: 'hyderabad', label: 'Hyderabad', state: 'Telangana' },
    { value: 'chennai', label: 'Chennai', state: 'Tamil Nadu' },
    { value: 'kolkata', label: 'Kolkata', state: 'West Bengal' },
    { value: 'pune', label: 'Pune', state: 'Maharashtra' },
    { value: 'ahmedabad', label: 'Ahmedabad', state: 'Gujarat' },
    { value: 'jaipur', label: 'Jaipur', state: 'Rajasthan' },
    { value: 'lucknow', label: 'Lucknow', state: 'Uttar Pradesh' },
    { value: 'chandigarh', label: 'Chandigarh', state: 'Punjab' },
    { value: 'kochi', label: 'Kochi', state: 'Kerala' },
  ],

  // Social Media Platforms (India-specific)
  platforms: [
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: '📷', 
      color: '#E4405F',
      popular: true,
      indian: false 
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: '▶️', 
      color: '#FF0000',
      popular: true,
      indian: false 
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: '👍', 
      color: '#1877F2',
      popular: true,
      indian: false 
    },
    { 
      id: 'sharechat', 
      name: 'ShareChat', 
      icon: '💬', 
      color: '#FF6B35',
      popular: true,
      indian: true 
    },
    { 
      id: 'moj', 
      name: 'Moj', 
      icon: '🎵', 
      color: '#8B5CF6',
      popular: true,
      indian: true 
    },
    { 
      id: 'josh', 
      name: 'Josh', 
      icon: '🎬', 
      color: '#F59E0B',
      popular: true,
      indian: true 
    },
    { 
      id: 'twitter', 
      name: 'Twitter', 
      icon: '🐦', 
      color: '#1DA1F2',
      popular: false,
      indian: false 
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: '💼', 
      color: '#0A66C2',
      popular: false,
      indian: false 
    },
  ],

  // Content Categories
  categories: [
    { value: 'fashion', label: 'Fashion & Lifestyle', icon: '👗', color: 'pink' },
    { value: 'tech', label: 'Technology & Gadgets', icon: '📱', color: 'blue' },
    { value: 'food', label: 'Food & Cooking', icon: '🍜', color: 'orange' },
    { value: 'entertainment', label: 'Entertainment & Comedy', icon: '🎭', color: 'purple' },
    { value: 'education', label: 'Education & Skills', icon: '📚', color: 'green' },
    { value: 'finance', label: 'Finance & Investment', icon: '💰', color: 'emerald' },
    { value: 'health', label: 'Health & Fitness', icon: '💪', color: 'red' },
    { value: 'travel', label: 'Travel & Tourism', icon: '✈️', color: 'cyan' },
    { value: 'gaming', label: 'Gaming', icon: '🎮', color: 'indigo' },
    { value: 'beauty', label: 'Beauty & Makeup', icon: '💄', color: 'rose' },
    { value: 'devotional', label: 'Devotional & Spirituality', icon: '🕉️', color: 'yellow' },
    { value: 'regional', label: 'Regional Content', icon: '🌏', color: 'teal' },
    { value: 'news', label: 'News & Current Affairs', icon: '📰', color: 'gray' },
    { value: 'music', label: 'Music & Dance', icon: '🎵', color: 'violet' },
    { value: 'sports', label: 'Sports & Cricket', icon: '🏏', color: 'lime' },
  ],

  // Creator Tiers
  creatorTiers: [
    { 
      id: 'nano', 
      name: 'Nano Creator', 
      range: '500 - 10K',
      minFollowers: 500, 
      maxFollowers: 10000,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      icon: '🌱'
    },
    { 
      id: 'micro', 
      name: 'Micro Influencer', 
      range: '10K - 50K',
      minFollowers: 10000, 
      maxFollowers: 50000,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      icon: '📱'
    },
    { 
      id: 'mid', 
      name: 'Mid-tier Creator', 
      range: '50K - 500K',
      minFollowers: 50000, 
      maxFollowers: 500000,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      icon: '⭐'
    },
    { 
      id: 'macro', 
      name: 'Macro Influencer', 
      range: '500K - 1M',
      minFollowers: 500000, 
      maxFollowers: 1000000,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      icon: '🔥'
    },
    { 
      id: 'mega', 
      name: 'Mega Influencer', 
      range: '1M+',
      minFollowers: 1000000, 
      maxFollowers: 100000000,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      icon: '👑'
    },
  ],

  // Budget Ranges (INR)
  budgetRanges: [
    { min: 5000, max: 25000, label: '₹5K - ₹25K', tier: 'nano' },
    { min: 25000, max: 100000, label: '₹25K - ₹1L', tier: 'micro' },
    { min: 100000, max: 500000, label: '₹1L - ₹5L', tier: 'mid' },
    { min: 500000, max: 2000000, label: '₹5L - ₹20L', tier: 'macro' },
    { min: 2000000, max: 10000000, label: '₹20L - ₹1Cr', tier: 'mega' },
  ],

  // Age Groups
  ageGroups: [
    { value: '13-17', label: '13-17 (Gen Z Early)', percentage: 15 },
    { value: '18-24', label: '18-24 (Gen Z)', percentage: 35 },
    { value: '25-34', label: '25-34 (Millennials)', percentage: 30 },
    { value: '35-44', label: '35-44 (Gen X)', percentage: 15 },
    { value: '45+', label: '45+ (Boomers)', percentage: 5 },
  ],

  // Gender Distribution
  genders: [
    { value: 'All', label: 'All Genders', icon: '👥' },
    { value: 'Male', label: 'Male', icon: '👨' },
    { value: 'Female', label: 'Female', icon: '👩' },
    { value: 'Other', label: 'Other', icon: '🌈' },
  ],

  // Currency Formatting
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    format: (amount: number) => {
      // Indian numbering system (lakhs, crores)
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)}Cr`;
      } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)}L`;
      } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
      }
      return `₹${amount.toLocaleString('en-IN')}`;
    },
  },

  // Popular Brands
  popularBrands: [
    { name: 'Flipkart', category: 'E-commerce', logo: '🛒' },
    { name: 'PhonePe', category: 'Fintech', logo: '💳' },
    { name: 'Swiggy', category: 'Food Delivery', logo: '🍔' },
    { name: "Byju's", category: 'EdTech', logo: '📚' },
    { name: 'Nykaa', category: 'Beauty', logo: '💄' },
    { name: 'Boat', category: 'Electronics', logo: '🎧' },
  ],

  // Deliverables
  deliverables: [
    { id: 'ig_post', label: 'Instagram Post', platform: 'instagram', icon: '📸' },
    { id: 'ig_story', label: 'Instagram Story', platform: 'instagram', icon: '📱' },
    { id: 'ig_reel', label: 'Instagram Reel', platform: 'instagram', icon: '🎬' },
    { id: 'yt_video', label: 'YouTube Video', platform: 'youtube', icon: '▶️' },
    { id: 'yt_short', label: 'YouTube Short', platform: 'youtube', icon: '📹' },
    { id: 'fb_post', label: 'Facebook Post', platform: 'facebook', icon: '👍' },
    { id: 'sharechat_post', label: 'ShareChat Post', platform: 'sharechat', icon: '💬' },
    { id: 'moj_video', label: 'Moj Video', platform: 'moj', icon: '🎵' },
    { id: 'josh_video', label: 'Josh Video', platform: 'josh', icon: '🎬' },
    { id: 'blog', label: 'Blog Article', platform: 'blog', icon: '✍️' },
  ],

  // Default Settings
  defaults: {
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    country: 'IN',
  },
};

// Utility functions
export const formatIndianCurrency = (amount: number): string => {
  return INDIA_CONFIG.currency.format(amount);
};

export const getTierByFollowers = (followers: number) => {
  return INDIA_CONFIG.creatorTiers.find(
    tier => followers >= tier.minFollowers && followers <= tier.maxFollowers
  );
};

export const getPlatformInfo = (platformId: string) => {
  return INDIA_CONFIG.platforms.find(p => p.id === platformId);
};

export const getCategoryInfo = (categoryValue: string) => {
  return INDIA_CONFIG.categories.find(c => c.value === categoryValue);
};

export default INDIA_CONFIG;
