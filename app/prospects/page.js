import Workspace from '../workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Prospects · Oparax', robots: {index: false}};

export default function ProspectsPage() {
  return <Workspace initialPage="Prospects" url={process.env.NEXT_PUBLIC_SUPABASE_URL}
    anon={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}/>;
}
