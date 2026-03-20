/**
 * Seed the base resume into Supabase.
 *
 * Usage:
 *   npx tsx src/lib/resume/seed.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import baseResume from './base-resume';

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Deactivate any existing active resumes
  const { error: deactivateError } = await supabase
    .from('base_resumes')
    .update({ is_active: false })
    .eq('is_active', true);

  if (deactivateError) {
    console.error('Failed to deactivate existing resumes:', deactivateError.message);
    process.exit(1);
  }

  // Insert new active resume
  const { data, error } = await supabase
    .from('base_resumes')
    .insert({
      name: 'base-v1',
      data: baseResume,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to seed base resume:', error.message);
    process.exit(1);
  }

  console.log('Base resume seeded successfully:');
  console.log(`  id:   ${data.id}`);
  console.log(`  name: ${data.name}`);
}

seed();
