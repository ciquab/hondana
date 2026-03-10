'use client';

import { useActionState, useMemo, useState } from 'react';
import { setChildMission } from '@/app/actions/mission';
import type { ActionResult } from '@/lib/actions/types';
import { trackNavigationEvent } from '@/lib/analytics/navigation-events';

type MissionTemplate = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  difficulty: string;
  target_type: string;
  target_value: number;
  sort_order: number;
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

type ParentExpectation = 'volume' | 'quality' | 'independence' | 'relationship';

type Props = {
  childId: string;
  familyId: string;
  templates: MissionTemplate[];
  activeMission: ActiveMission | null;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'やさしい',
  normal: 'ふつう',
  challenge: 'チャレンジ'
};

const DIFFICULTY_ORDER = ['easy', 'normal', 'challenge'];

const EXPECTATION_OPTIONS: {
  value: ParentExpectation;
  label: string;
  kpiLabel: string;
}[] = [
  {
    value: 'volume',
    label: '量をのばしたい',
    kpiLabel: 'KPI: しゅうあたり読書回数'
  },
  {
    value: 'quality',
    label: '質をたかめたい',
    kpiLabel: 'KPI: ものがたり比率・完読率'
  },
  {
    value: 'independence',
    label: 'じぶんで選べるようにしたい',
    kpiLabel: 'KPI: じこ選択率・継続日数'
  },
  {
    value: 'relationship',
    label: '親子の会話をふやしたい',
    kpiLabel: 'KPI: 読み聞かせ回数・コメント返信率'
  }
];

function scoreTemplate(
  template: MissionTemplate,
  expectation: ParentExpectation
): number {
  if (expectation === 'volume') {
    return template.target_type === 'total_count' ? 3 : 1;
  }

  if (expectation === 'quality') {
    if (
      template.target_type === 'genre_count' ||
      template.target_type === 'new_genre'
    )
      return 3;
    if (template.target_type === 'streak_days') return 2;
    return 1;
  }

  if (expectation === 'independence') {
    if (
      template.difficulty === 'challenge' ||
      template.target_type === 'new_genre'
    )
      return 3;
    if (template.target_type === 'streak_days') return 2;
    return 1;
  }

  // relationship
  if (template.id === 'read_aloud') return 3;
  if (template.target_type === 'genre_count') return 2;
  return 1;
}

export function MissionSetup({
  childId,
  familyId,
  templates,
  activeMission
}: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    setChildMission,
    {}
  );
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [durationDays, setDurationDays] = useState<7 | 14>(7);
  const [parentExpectation, setParentExpectation] =
    useState<ParentExpectation>('volume');
  const [customTargetValue, setCustomTargetValue] = useState<number>(0);

  const selectedTemplateData =
    templates.find((t) => t.id === selectedTemplate) ?? null;

  const grouped = useMemo(
    () =>
      DIFFICULTY_ORDER.map((difficulty) => {
        const items = templates
          .filter((template) => template.difficulty === difficulty)
          .sort((a, b) => {
            const scoreDiff =
              scoreTemplate(b, parentExpectation) -
              scoreTemplate(a, parentExpectation);
            if (scoreDiff !== 0) return scoreDiff;
            return a.sort_order - b.sort_order;
          });

        return {
          difficulty,
          label: DIFFICULTY_LABELS[difficulty],
          items
        };
      }).filter((g) => g.items.length > 0),
    [templates, parentExpectation]
  );

  const daysLeft = activeMission
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeMission.ends_at).getTime() - Date.now()) / 86400000
        )
      )
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
                  width: `${Math.min(100, (activeMission.current_progress / activeMission.target_value) * 100)}%`
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              親のきたい
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {EXPECTATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setParentExpectation(option.value)}
                  className={`rounded-md border px-2 py-1 text-left text-xs transition ${
                    parentExpectation === option.value
                      ? 'border-sky-400 bg-sky-50 text-sky-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {
                EXPECTATION_OPTIONS.find(
                  (option) => option.value === parentExpectation
                )?.kpiLabel
              }
            </p>
          </div>

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
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setCustomTargetValue(t.target_value);
                    }}
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

          {selectedTemplateData && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">
                  きかん
                  <select
                    value={durationDays}
                    onChange={(e) =>
                      setDurationDays(e.target.value === '14' ? 14 : 7)
                    }
                    className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value={7}>1しゅうかん</option>
                    <option value={14}>2しゅうかん</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  もくひょう
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={customTargetValue}
                    onChange={(e) =>
                      setCustomTargetValue(Number(e.target.value))
                    }
                    className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                テンプレ標準: {selectedTemplateData.target_value} /
                変更できるはんい: 1〜20
              </p>
            </div>
          )}

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setSelectedTemplate('');
                setCustomTargetValue(0);
                setDurationDays(7);
              }}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
            >
              キャンセル
            </button>
            <form
              action={formAction}
              className="flex-1"
              onSubmit={() => {
                trackNavigationEvent({
                  event: 'mission_set',
                  childId,
                  target: selectedTemplate,
                  meta: {
                    duration_days: durationDays,
                    custom_target_value: customTargetValue || null,
                    expectation: parentExpectation
                  }
                });
              }}
            >
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="familyId" value={familyId} />
              <input type="hidden" name="templateId" value={selectedTemplate} />
              <input type="hidden" name="durationDays" value={durationDays} />
              <input
                type="hidden"
                name="customTargetValue"
                value={customTargetValue || ''}
              />
              <button
                type="submit"
                disabled={
                  !selectedTemplate ||
                  pending ||
                  customTargetValue < 1 ||
                  customTargetValue > 20
                }
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
