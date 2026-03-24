import { AlertTriangle } from 'lucide-react'

interface Notification {
  id: string
  title: string
  body: string
  created_at: string
}

export default function EmergencyBanner({ notification }: { notification: Notification }) {
  return (
    <div className="bg-red-600 text-white rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="font-bold text-sm">緊急お知らせ</p>
          <p className="font-semibold mt-1">{notification.title}</p>
          <p className="text-sm text-red-100 mt-1">{notification.body}</p>
          <p className="text-xs text-red-200 mt-2">{new Date(notification.created_at).toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>
  )
}
