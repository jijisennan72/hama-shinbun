'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Bell, AlertTriangle, Trash2 } from 'lucide-react'

interface NotificationItem {
  id: string
  title: string
  body: string
  is_emergency: boolean
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [history, setHistory] = useState<NotificationItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('notifications')
      .select('id, title, body, is_emergency, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`このお知らせを削除しますか？住民側からも消えます\n\n「${title}」`)) return
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (!error) setHistory(prev => prev.filter(n => n.id !== id))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('notifications').insert({
      title: title.trim(),
      body: body.trim(),
      is_emergency: isEmergency,
      is_active: true,
    }).select('id, title, body, is_emergency, created_at').single()
    if (!error && data) {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: data.id, title: data.title, body: data.body, isEmergency }),
      })
      setHistory(prev => [data, ...prev].slice(0, 20))
    }
    setSent(true)
    setLoading(false)
  }

  const historySection = (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">送信履歴</h2>
      {history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">送信履歴がありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {history.map(item => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${item.is_emergency ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {item.is_emergency
                      ? <AlertTriangle className="w-4 h-4 text-red-600" />
                      : <Bell className="w-4 h-4 text-gray-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {item.is_emergency && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          🚨 緊急
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.body.length > 30 ? item.body.slice(0, 30) + '…' : item.body}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-xl font-bold">送信完了</h2>
          <button onClick={() => { setSent(false); setTitle(''); setBody(''); setIsEmergency(false) }} className="btn-secondary">
            続けて送信
          </button>
        </div>
        {historySection}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="input-field resize-none" required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isEmergency} onChange={e => setIsEmergency(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-red-600">緊急お知らせとして送信</span>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '送信中...' : '全世帯に通知を送信'}
          </button>
        </form>
      </div>
      {historySection}
    </div>
  )
}
