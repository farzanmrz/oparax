import Workspace from '../workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title:'Research activity · Oparax', robots:{index:false}};

export default async function ResearchPage({searchParams}) {
  const {agent} = await searchParams;
  const id = typeof agent === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(agent) ? agent : null;
  return <Workspace initialAgentId={id} url={process.env.NEXT_PUBLIC_SUPABASE_URL}
    anon={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}/>;
}
