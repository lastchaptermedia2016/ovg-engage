/** @ts-ignore */
declare const process: any;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('client_id', 'LUXE-001')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json(error);
  
  // Bereken totale inkomste
  const totalRevenue = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const totalBookings = data.length;

  res.status(200).json({ data, totalRevenue, totalBookings });
}
