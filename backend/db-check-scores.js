const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT campaign_id, embedding::text
    FROM campaign_embeddings
    WHERE campaign_id = '5ae3e5a6-f4ce-4485-b723-8d42976d6764'
  `);
  
  const row = res.rows[0];
  console.log('Campaign ID:', row.campaign_id);
  console.log('Embedding type:', typeof row.embedding);
  console.log('Embedding snippet:', row.embedding ? row.embedding.substring(0, 100) : 'null');
  
  if (row.embedding) {
    const arr = JSON.parse(row.embedding);
    console.log('Is Array:', Array.isArray(arr));
    console.log('Length:', arr.length);
    console.log('NaN elements count:', arr.filter(isNaN).length);
    console.log('First 5 elements:', arr.slice(0, 5));
  }
  
  await client.end();
}

run();
