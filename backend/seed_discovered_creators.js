const { Client } = require('pg');
require('dotenv').config();

const discoveredCreatorsSeed = [
  {
    name: 'Tech Burner (Shlok Srivastava)',
    handle: '@techburner',
    platform: 'youtube',
    followers_count: 11200000,
    engagement_rate: 6.8,
    match_score: 95,
    categories: ['tech', 'gadgets', 'reviews'],
    region: 'Delhi, India',
    profile_url: 'https://youtube.com/@techburner',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Top Indian tech reviewer known for energetic unboxings and gadgets test.',
  },
  {
    name: 'Gyan Therapy (Rakesh Verma)',
    handle: '@gyantherapy',
    platform: 'youtube',
    followers_count: 3100000,
    engagement_rate: 5.4,
    match_score: 92,
    categories: ['tech', 'smartphones', 'reviews'],
    region: 'Jaipur, India',
    profile_url: 'https://youtube.com/@gyantherapy',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Honest smartphone reviews and tech buying advice in Hindi.',
  },
  {
    name: 'Trakin Tech (Ershad Kaleebullah)',
    handle: '@trakintech',
    platform: 'youtube',
    followers_count: 14500000,
    engagement_rate: 4.9,
    match_score: 89,
    categories: ['tech', 'gadgets', 'news'],
    region: 'Pune, India',
    profile_url: 'https://youtube.com/@trakintech',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Daily mobile launches, gadget unboxings, and tech news.',
  },
  {
    name: 'Tech Unboxing Micro (Nikhil Sharma)',
    handle: '@techunboxing_in',
    platform: 'youtube',
    followers_count: 85000,
    engagement_rate: 8.2,
    match_score: 88,
    categories: ['tech', 'gadgets'],
    region: 'Mumbai, India',
    profile_url: 'https://youtube.com/@techunboxing_in',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Micro tech creator with extremely high engagement on flagship phone reviews.',
  },
  {
    name: 'Geekyranjit (Ranjit Kumar)',
    handle: '@geekyranjit',
    platform: 'youtube',
    followers_count: 3400000,
    engagement_rate: 4.2,
    match_score: 87,
    categories: ['tech', 'reviews'],
    region: 'Hyderabad, India',
    profile_url: 'https://youtube.com/@geekyranjit',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Veteran in Indian tech review space focusing on long-term device reviews.',
  },
  {
    name: 'Komal Pandey',
    handle: '@komalpandeyofficial',
    platform: 'instagram',
    followers_count: 1900000,
    engagement_rate: 7.1,
    match_score: 94,
    categories: ['fashion', 'beauty', 'lifestyle'],
    region: 'Delhi, India',
    profile_url: 'https://instagram.com/komalpandeyofficial',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'High-fashion lookbooks and innovative styling reels.',
  },
  {
    name: 'Sejal Kumar',
    handle: '@sejalkumar1194',
    platform: 'instagram',
    followers_count: 870000,
    engagement_rate: 5.8,
    match_score: 90,
    categories: ['fashion', 'lifestyle', 'beauty'],
    region: 'Gurgaon, India',
    profile_url: 'https://instagram.com/sejalkumar1194',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Lifestyle, travel, and fashion content targeting urban youth.',
  },
  {
    name: 'FitTubers (Vivek Mittal)',
    handle: '@fittuber',
    platform: 'youtube',
    followers_count: 7200000,
    engagement_rate: 8.5,
    match_score: 91,
    categories: ['health', 'fitness', 'nutrition'],
    region: 'Punjab, India',
    profile_url: 'https://youtube.com/@fittuber',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Natural health, clean nutrition, and fitness product reviews.',
  },
  {
    name: 'Ankur Warikoo',
    handle: '@ankurwarikoo',
    platform: 'instagram',
    followers_count: 2400000,
    engagement_rate: 6.2,
    match_score: 89,
    categories: ['finance', 'productivity', 'education'],
    region: 'Gurgaon, India',
    profile_url: 'https://instagram.com/ankurwarikoo',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Financial literacy, career growth, and startup content.',
  },
  {
    name: 'Kabita Singh (Kabita\'s Kitchen)',
    handle: '@kabitaskitchen',
    platform: 'youtube',
    followers_count: 13800000,
    engagement_rate: 5.5,
    match_score: 93,
    categories: ['food', 'cooking', 'lifestyle'],
    region: 'Mumbai, India',
    profile_url: 'https://youtube.com/@kabitaskitchen',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Easy home recipes and kitchenware recommendations.',
  },
  {
    name: 'TechGamer Micro (Rohan Gupta)',
    handle: '@rohan_tech_gadgets',
    platform: 'youtube',
    followers_count: 42000,
    engagement_rate: 9.4,
    match_score: 86,
    categories: ['tech', 'gadgets'],
    region: 'Bengaluru, India',
    profile_url: 'https://youtube.com/@rohan_tech_gadgets',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'High CTR gaming and mobile gadget reviewer.',
  },
  {
    name: 'Style With Sneha',
    handle: '@stylewithsneha',
    platform: 'instagram',
    followers_count: 120000,
    engagement_rate: 7.8,
    match_score: 88,
    categories: ['fashion', 'beauty'],
    region: 'Mumbai, India',
    profile_url: 'https://instagram.com/stylewithsneha',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    ai_summary: 'Mid-tier fashion creator specializing in brand try-on hauls.',
  }
];

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('🔌 Connected to Postgres for seeding discovered creators...');

  // Get campaign IDs
  const res = await client.query('SELECT id FROM campaigns LIMIT 5');
  const campaigns = res.rows;

  let inserted = 0;
  for (let i = 0; i < discoveredCreatorsSeed.length; i++) {
    const creator = discoveredCreatorsSeed[i];
    const targetCampaignId = campaigns[i % campaigns.length]?.id;

    await client.query(`
      INSERT INTO discovered_creators (
        campaign_id, name, handle, platform, followers_count, engagement_rate,
        match_score, categories, region, profile_url, avatar_url, ai_summary, rank
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      targetCampaignId,
      creator.name,
      creator.handle,
      creator.platform,
      creator.followers_count,
      creator.engagement_rate,
      creator.match_score,
      creator.categories,
      creator.region,
      creator.profile_url,
      creator.avatar_url,
      creator.ai_summary,
      i + 1
    ]);
    inserted++;
  }

  console.log(`✅ Inserted ${inserted} high-quality web-discovered creators into discovered_creators table!`);
  await client.end();
}

seed().catch(console.error);
