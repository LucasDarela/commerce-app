// app/dashboard/notifications/page.tsx
"use client"

import { useState } from "react"
import { Bell, Trash2, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Notification {
  id: number
  title: string
  description: string
  date: string
  read: boolean
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: "New Sale Registered",
      description: "A new sale has been recorded for your company.",
      date: "2025-03-31 10:00 AM",
      read: false,
    },
    {
      id: 2,
      title: "Subscription Renewed",
      description: "Your monthly subscription was successfully renewed.",
      date: "2025-03-30 2:22 PM",
      read: true,
    },
    {
      id: 3,
      title: "New Team Member",
      description: "A new team member has been added to your account.",
      date: "2025-03-28 9:45 AM",
      read: false,
    },
  ])

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6" />
        Notifications
      </h1>
      <Separator />

      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-center mt-12">
          You have no notifications.
        </p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition border ${
                notification.read ? "opacity-60" : ""
              }`}
            >
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                  <span className="text-xs text-gray-500">{notification.date}</span>
                </div>
                <div className="flex gap-2">
                  {!notification.read && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="w-4 h-4" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}