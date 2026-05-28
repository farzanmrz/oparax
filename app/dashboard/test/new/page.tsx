import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { TestWorkflowForm } from '@/components/test-workflow-form';

export default function NewTestWorkflowPage() {
  return (
    <div className='flex w-full flex-col gap-8'>
      <DashboardPageHeader
        title='Create Test Workflow'
        breadcrumbs={[
          { label: 'Test Workflows', href: '/dashboard/test' },
          { label: 'Create Test Workflow' },
        ]}
      />
      <TestWorkflowForm />
    </div>
  );
}
