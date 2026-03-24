import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyPage from '@/components/MyPage'

export default async function MyPagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/mypage')

  const { data: household } = await supabase
    .from('households')
    .select('id, household_number, name')
    .eq('user_id', user.id)
    .single()

  if (!household) redirect('/')

  const [{ data: registrationsRaw }, { data: feedbacksRaw }, { data: surveyResponsesRaw }] = await Promise.all([
    supabase
      .from('event_registrations')
      .select('id, attendee_count, notes, created_at, events(id, title, event_date, location)')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('feedbacks')
      .select('id, category, message, is_resolved, resolved_at, created_at')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('survey_responses')
      .select('survey_id, created_at, surveys(id, title)')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false }),
  ])

  const registrations = (registrationsRaw || []).map(r => ({
    id: r.id,
    attendee_count: r.attendee_count,
    notes: r.notes as string | null,
    created_at: r.created_at,
    event: r.events
      ? {
          id: (r.events as any).id as string,
          title: (r.events as any).title as string,
          event_date: (r.events as any).event_date as string,
          location: (r.events as any).location as string | null,
        }
      : null,
  }))

  const feedbacks = (feedbacksRaw || []).map(f => ({
    id: f.id,
    category: f.category,
    message: f.message,
    is_resolved: (f.is_resolved as boolean | null) ?? false,
    resolved_at: (f.resolved_at as string | null) ?? null,
    created_at: f.created_at,
  }))

  // アンケートIDで重複排除し、最初の回答日時を使用
  const seenSurveyIds = new Set<string>()
  const answeredSurveys = (surveyResponsesRaw || [])
    .filter(r => {
      if (seenSurveyIds.has(r.survey_id)) return false
      seenSurveyIds.add(r.survey_id)
      return true
    })
    .map(r => ({
      survey_id: r.survey_id,
      answered_at: r.created_at,
      title: (r.surveys as any)?.title ?? '不明なアンケート',
    }))

  return (
    <MyPage
      household={household}
      registrations={registrations}
      feedbacks={feedbacks}
      answeredSurveys={answeredSurveys}
    />
  )
}
