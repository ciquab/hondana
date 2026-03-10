import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    console.info('[navigation-event]', body);
  } catch {
    // noop
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
