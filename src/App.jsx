import { Toaster } from '@/components/ui/toaster';
import AgentView from '@/pages/AgentView';

// local-first: no auth, no routing — the dashboard is the app.
export default function App() {
  return (
    <>
      <AgentView />
      <Toaster />
    </>
  );
}
