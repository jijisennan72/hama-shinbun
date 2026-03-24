'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, CheckCircle } from 'lucide-react'

export default function NotificationsPage() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; created_at: string; is_emergency: boolean }[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
    checkSubscription()
  }, [])

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      }
    }
  }

  const toggleSubscription = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (isSubscribed) {
        const sub = await reg.pushManager.getSubscription()
        await sub?.unsubscribe()
        setIsSubscribed(false)
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        })
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('push_subscriptions').upsert({
          user_id: user?.id,
          subscription: JSON.stringify(sub),
        }, { onConflict: 'user_id' })
        setIsSubscribed(true)
      }
    } catch {
      alert('プッシュ通知の設定に失敗しました')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 mt-2">お知らせ・通知設定</h1>
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">プッシュ通知</p>
            <p className="text-sm text-gray-500">{isSubscribed ? '通知が有効です' : '通知が無効です'}</p>
          </div>
          <button
            onClick={toggleSubscription}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              isSubscribed ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            }`}
          >
            {isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {isSubscribed ? '通知オフ' : '通知オン'}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">過去のお知らせ</h2>
        {notifications.length === 0 && (
          <div className="card text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">お知らせはありません</p>
          </div>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`card ${n.is_emergency ? 'border-red-300 bg-red-50' : ''}`}>
            {n.is_emergency && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mb-1 inline-block">緊急</span>}
            <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
            <p className="text-gray-600 text-sm mt-1">{n.body}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString('ja-JP')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
