'use client';

import { useActionState, useState } from 'react';
import { setChildMission } from '@/app/actions/mission';
import type { ActionResult } from '@/lib/actions/types';

type MissionTemplate = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  difficulty: string;
  target_value: number;
};

type ActiveMission = {
  mission_id: string;
  template_id: string;
  title: string;
  icon: string;
  target_value: number;
  current_progress: number;
  status: string;
  ends_at: string;
};

type Props = {
  childId: string;
  familyId: string;
  templates: MissionTemplate[];
  activeMission: ActiveMission | null;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'やさしい',
  normal: 'ふつう',
  challenge: 'チャレンジ',
};

const DIFFICULTY_ORDER = ['easy', 'normal', 'challenge'];

export function MissionSetup({ childId, familyId, templates, activeMission }: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    setChildMission,
    {}
  );
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const grouped = DIFFICULTY_ORDER.map((d) => ({
    difficulty: d,
    label: DIFFICULTY_LABELS[d],
    items: templates.filter((t) => t.difficulty === d),
  })).filter((g) => g.items.length > 0);

  const daysLeft = activeMission
    ? Math.max(0, Math.ceil((new Date(activeMission.ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <section className="rounded-xl bg-white p-4 shadow">
      <h3 className="mb-3 text-base font-semibold">🎯 ミッション</h3>

      {activeMission ? (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeMission.icon}</span>
            <span className="font-medium">{activeMission.title}</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {activeMission.current_progress} / {activeMission.target_value}
              </span>
              <span>
                {activeMission.status === 'completed'
                  ? '🎉 たっせい！'
                  : `のこり ${daysLeft}日`}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  activeMission.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-orange-400'
                }`}
                style={{
                  width: `${Math.min(100, (activeMission.current_progress / activeMission.target_value) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-sm text-slate-500">
          ミッションを設定して、読書のもくひょうを作りましょう。
        </p>
      )}

      {!showPicker ? (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          {activeMission ? 'ミッションをかえる' : 'ミッションをえらぶ'}
        </button>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.difficulty}>
              <p className="mb-1 text-xs font-semibold text-slate-400">
                ── {group.label} ──
              </p>
              <div className="space-y-1">
                {group.items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedTemplate === t.id
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setSelectedTemplate('');
              }}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
            >
              キャンセル
            </button>
            <form action={formAction} className="flex-1">
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="familyId" value={familyId} />
              <input type="hidden" name="templateId" value={selectedTemplate} />
              <button
                type="submit"
                disabled={!selectedTemplate || pending}
                className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {pending ? '設定中…' : 'このミッションをはじめる'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
