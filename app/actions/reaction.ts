'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VALID_EMOJIS = ['heart', 'thumbsup', 'star', 'clap'] as const;
type Emoji = (typeof VALID_EMOJIS)[number];

export async function toggleReaction(recordId: string, emoji: string) {
  if (!VALID_EMOJIS.includes(emoji as Emoji)) {
    return { error: '無効なリアクションです。' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch record to get family_id (RLS ensures family access)
  const { data: record } = await supabase
    .from('reading_records')
    .select('id, family_id')
    .eq('id', recordId)
    .single();

  if (!record) {
    return { error: '記録が見つかりません。' };
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('record_reactions')
    .select('id')
    .eq('record_id', recordId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .single();

  if (existing) {
    // Remove reaction (toggle off)
    await supabase.from('record_reactions').delete().eq('id', existing.id);
  } else {
    // Add reaction (toggle on)
    await supabase.from('record_reactions').insert({
      record_id: recordId,
      family_id: record.family_id,
      user_id: user.id,
      emoji,
    });
  }

  return {};
}
