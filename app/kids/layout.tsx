import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';
import { AgeModeProvider } from '@/lib/kids/age-mode-context';
import { getKidSession } from '@/lib/kids/session';
import { createChildSessionClient } from '@/lib/supabase/child';

export default async function KidsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getKidSession();
  const mode = session
    ? await resolveKidAgeMode(
        createChildSessionClient({ childId: session.childId, familyId: session.familyId }),
        session.childId
      )
    : 'standard';

  return (
    <AgeModeProvider mode={mode}>
      <div
        className="min-h-screen"
        style={{
          background:
            'radial-gradient(ellipse 100% 35% at 50% 0%, #fff3cc 0%, transparent 100%), linear-gradient(180deg, #fafaf9 0%, #f7f6f4 100%)'
        }}
      >
        {children}
      </div>
    </AgeModeProvider>
  );
}
