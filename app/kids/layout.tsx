import { requireKidContext } from '@/lib/kids/client';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';
import { AgeModeProvider } from '@/lib/kids/age-mode-context';

export default async function KidsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { childId, supabase } = await requireKidContext();
  const mode = await resolveKidAgeMode(supabase, childId);

  return (
    <AgeModeProvider mode={mode}>
      <div
        className="min-h-screen"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, #fff4d9 0%, #fff4d9 20%, transparent 55%), radial-gradient(circle at 85% 0%, #ffe6f2 0%, #ffe6f2 18%, transparent 50%), linear-gradient(180deg, #fff9ed 0%, #fff6e5 45%, #fff2df 100%)'
        }}
      >
        {children}
      </div>
    </AgeModeProvider>
  );
}
