import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    const { data: servers, error } = await supabase.from('servers').select('id, cfx_id');
    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    console.log('Current servers:');
    for (const s of (servers || [])) {
        const normalized = s.cfx_id.trim().toLowerCase();
        const isNormalized = s.cfx_id === normalized;
        console.log(`- ID: ${s.id}, CFX_ID: "${s.cfx_id}" [${isNormalized ? 'OK' : 'NEEDS FIX'}]`);

        if (!isNormalized) {
            console.log(`Fixing ${s.cfx_id} -> ${normalized}`);
            const { error: updateError } = await supabase.from('servers').update({ cfx_id: normalized }).eq('id', s.id);
            if (updateError) console.error('Update error:', updateError);
        }
    }
}

check();
