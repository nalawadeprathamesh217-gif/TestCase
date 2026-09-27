require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBuckets() {
  const buckets = ['requirement-documents', 'test-case-imports'];
  for (const bucketName of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: null,
      fileSizeLimit: 25 * 1024 * 1024 // 25MB
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`Bucket ${bucketName} already exists.`);
      } else {
        console.error(`Error creating bucket ${bucketName}:`, error.message);
      }
    } else {
      console.log(`Successfully created bucket ${bucketName}`);
    }
  }
}

createBuckets();
