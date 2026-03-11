import { requireKidContext } from '@/lib/kids/client';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';
import { AgeModeProvider } from '@/lib/kids/age-mode-context';

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const { childId, supabase } = await requireKidContext();
  const mode = await resolveKidAgeMode(supabase, childId);

  return (
    <AgeModeProvider mode={mode}>
      <div style={{ backgroundColor: '#FFFBF0', minHeight: '100vh' }}>{children}</div>
    </AgeModeProvider>
  );
}
