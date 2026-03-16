import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function AnimatedSkeleton({ className, style, ...props }: AnimatedSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        "relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
        className
      )}
      style={style}
      {...props}
    />
  );
}

interface PageSkeletonProps {
  variant?: "dashboard" | "table" | "cards" | "form";
}

export function PageSkeleton({ variant = "dashboard" }: PageSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-6 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="space-y-2">
          <AnimatedSkeleton className="h-8 w-64" />
          <AnimatedSkeleton className="h-4 w-96" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <AnimatedSkeleton className="h-10 w-32" />
          <AnimatedSkeleton className="h-10 w-40" />
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <AnimatedSkeleton className="h-4 w-24" />
                <AnimatedSkeleton className="h-10 w-10 rounded-lg" />
              </div>
              <AnimatedSkeleton className="h-8 w-16" />
              <AnimatedSkeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Main content card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <AnimatedSkeleton className="h-6 w-40" />
              <AnimatedSkeleton className="h-4 w-64" />
            </div>
            <AnimatedSkeleton className="h-9 w-24" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <AnimatedSkeleton
                key={i}
                className="h-16 w-full"
                style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-6 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <AnimatedSkeleton className="h-8 w-48" />
            <AnimatedSkeleton className="h-4 w-72" />
          </div>
          <AnimatedSkeleton className="h-10 w-32" />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <AnimatedSkeleton className="h-10 flex-1 max-w-sm" />
          <AnimatedSkeleton className="h-10 w-[150px]" />
          <AnimatedSkeleton className="h-10 w-[150px]" />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <AnimatedSkeleton className="h-10 w-full" />
          </div>
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <AnimatedSkeleton className="h-4 w-4" />
                <AnimatedSkeleton className="h-4 w-28" />
                <AnimatedSkeleton className="h-4 w-20" />
                <AnimatedSkeleton className="h-6 w-16 rounded-full" />
                <AnimatedSkeleton className="h-4 flex-1" />
                <AnimatedSkeleton className="h-4 w-24" />
                <AnimatedSkeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="space-y-2">
          <AnimatedSkeleton className="h-8 w-48" />
          <AnimatedSkeleton className="h-4 w-64" />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-3"
            >
              <AnimatedSkeleton className="h-4 w-32" />
              <AnimatedSkeleton className="h-8 w-20" />
              <AnimatedSkeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Cards list */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="space-y-2">
            <AnimatedSkeleton className="h-6 w-32" />
            <AnimatedSkeleton className="h-4 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
              >
                <AnimatedSkeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <AnimatedSkeleton className="h-4 w-40" />
                  <AnimatedSkeleton className="h-3 w-32" />
                </div>
                <AnimatedSkeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="space-y-6 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="space-y-2">
          <AnimatedSkeleton className="h-8 w-48" />
          <AnimatedSkeleton className="h-4 w-72" />
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-6">
          <div className="space-y-2">
            <AnimatedSkeleton className="h-6 w-40" />
            <AnimatedSkeleton className="h-4 w-64" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <AnimatedSkeleton className="h-4 w-24" />
                <AnimatedSkeleton className="h-10 w-full" />
              </div>
            ))}
          </div>

          <AnimatedSkeleton className="h-px w-full" />

          <div className="flex justify-end">
            <AnimatedSkeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Staggered card skeleton for lists
interface StaggeredSkeletonProps {
  count?: number;
  className?: string;
}

export function StaggeredCardSkeleton({ count = 4, className }: StaggeredSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50">
            <AnimatedSkeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <AnimatedSkeleton className="h-4 w-3/4" />
              <AnimatedSkeleton className="h-3 w-1/2" />
            </div>
            <AnimatedSkeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
