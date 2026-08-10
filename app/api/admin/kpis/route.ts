import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getTeamKpis, presetRange } from '@/lib/kpis';

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const preset = searchParams.get('preset') as 'today' | 'week' | 'last30' | null;
  const userId = searchParams.get('userId') ?? undefined;

  let range;
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    range = { from, to };
  } else {
    range = presetRange(preset ?? 'week');
  }

  const kpis = await getTeamKpis(range, userId);
  return NextResponse.json({ ...kpis, range });
}
