import * as React from "react"
import { PlayCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ElementType
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
  tutorialHref?: string
  videoUrl?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  tutorialHref,
  videoUrl,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-[450px] shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
          <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        </div>
        
        <h3 className="mt-4 text-xl font-semibold">{title}</h3>
        
        <p className="mb-8 mt-2 text-sm text-muted-foreground leading-6">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && (actionHref || actionOnClick) && (
            actionHref ? (
              <Link href={actionHref}>
                <Button className="w-full sm:w-auto shadow-sm">
                  {actionLabel}
                </Button>
              </Link>
            ) : (
              <Button onClick={actionOnClick} className="w-full sm:w-auto shadow-sm">
                {actionLabel}
              </Button>
            )
          )}
          
          {videoUrl && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto gap-2 text-muted-foreground">
                  <PlayCircle className="h-4 w-4" />
                  Assistir Tutorial
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-background border-none shadow-2xl">
                <DialogTitle className="sr-only">Tutorial Video</DialogTitle>
                <div className="relative w-full aspect-video rounded-xl bg-muted overflow-hidden shadow-sm">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={videoUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {tutorialHref && !videoUrl && (
            <Link href={tutorialHref} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full sm:w-auto gap-2 text-muted-foreground">
                <PlayCircle className="h-4 w-4" />
                Assistir Tutorial
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
