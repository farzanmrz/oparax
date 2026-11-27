import Workspace from './workspace';
export const dynamic='force-dynamic';
export default function Home(){return <Workspace url={process.env.NEXT_PUBLIC_SUPABASE_URL} anon={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}/>}
