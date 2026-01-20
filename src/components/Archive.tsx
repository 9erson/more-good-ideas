import { AlertTriangle, RotateCcw, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import type { ArchivedIdea, ArchivedTopic, ArchiveItemType } from "@/lib/types"
import { cn } from "@/lib/utils"

type ArchiveItem = (ArchivedTopic & { type: "topic" }) | (ArchivedIdea & { type: "idea" })

function ArchiveItemCard({
  item,
  onRestoreClick,
  onDeleteClick,
}: {
  item: ArchiveItem
  onRestoreClick: (item: ArchiveItem) => void
  onDeleteClick: (item: ArchiveItem) => void
}) {
  const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Card className="h-full transition-all hover:shadow-md flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                  (item.type === "topic"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400")
                }
              >
                {item.type === "topic" ? "Topic" : "Idea"}
              </span>
            </div>
            <CardTitle className="text-xl">{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="mt-2">{item.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {item.type === "topic" ? (
            <>
              {item.ideaCount} {item.ideaCount === 1 ? "idea" : "ideas"} · Archived {formattedDate}
            </>
          ) : (
            <>Archived {formattedDate}</>
          )}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => onRestoreClick(item)} variant="default" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore
          </Button>
          <Button onClick={() => onDeleteClick(item)} variant="destructive" className="flex-1">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <div className="h-6 bg-muted animate-pulse rounded-full w-16" />
          <div className="h-6 bg-muted animate-pulse rounded-full w-20" />
        </div>
        <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
      </CardContent>
    </Card>
  )
}

type ToastData = {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function Archive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [topics, setTopics] = useState<ArchivedTopic[]>([])
  const [ideas, setIdeas] = useState<ArchivedIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<ArchiveItemType>("all")
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Restore state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [itemToRestore, setItemToRestore] = useState<ArchiveItem | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ArchiveItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const [toasts, setToasts] = useState<ToastData[]>([])

  // Initialize state from URL params on mount
  useEffect(() => {
    const searchParam = searchParams.get("search")
    const tagsParam = searchParams.get("tags")
    const typeParam = searchParams.get("type")

    if (searchParam) setSearchQuery(searchParam)
    if (searchParam) setDebouncedSearchQuery(searchParam)
    if (tagsParam) setSelectedTags(tagsParam.split(","))
    if (typeParam && (typeParam === "topics" || typeParam === "ideas" || typeParam === "all")) {
      setTypeFilter(typeParam as ArchiveItemType)
    }
  }, [])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery)
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","))
    if (typeFilter !== "all") params.set("type", typeFilter)
    setSearchParams(params)
  }, [debouncedSearchQuery, selectedTags, typeFilter, setSearchParams])

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    async function fetchArchivedItems() {
      try {
        setIsLoading(true)
        setError(null)

        const [topicsResponse, ideasResponse] = await Promise.all([
          fetch("/api/archive/topics"),
          fetch("/api/archive/ideas"),
        ])

        if (!topicsResponse.ok || !ideasResponse.ok) {
          throw new Error("Failed to fetch archived items")
        }

        const topicsData = await topicsResponse.json()
        const ideasData = await ideasResponse.json()

        setTopics(topicsData)
        setIdeas(ideasData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchArchivedItems()
  }, [])

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>()
    topics.forEach((t) => t.tags.forEach((tag) => tagMap.set(tag, (tagMap.get(tag) || 0) + 1)))
    ideas.forEach((i) => i.tags.forEach((tag) => tagMap.set(tag, (tagMap.get(tag) || 0) + 1)))
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [topics, ideas])

  const filteredItems = useMemo(() => {
    let items: ArchiveItem[] = []

    if (typeFilter === "all" || typeFilter === "topics") {
      items.push(...topics.map((t) => ({ ...t, type: "topic" as const })))
    }

    if (typeFilter === "all" || typeFilter === "ideas") {
      items.push(...ideas.map((i) => ({ ...i, type: "idea" as const })))
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      )
    }

    if (selectedTags.length > 0) {
      items = items.filter((item) => selectedTags.every((tag) => item.tags.includes(tag)))
    }

    return items
  }, [topics, ideas, debouncedSearchQuery, selectedTags, typeFilter])

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    Promise.all([fetch("/api/archive/topics"), fetch("/api/archive/ideas")])
      .then(async ([topicsRes, ideasRes]) => {
        if (!topicsRes.ok || !ideasRes.ok) throw new Error("Failed to fetch")
        const topicsData = await topicsRes.json()
        const ideasData = await ideasRes.json()
        setTopics(topicsData)
        setIdeas(ideasData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }

  const handleClearFilters = useCallback(() => {
    setSearchQuery("")
    setDebouncedSearchQuery("")
    setSelectedTags([])
    setTypeFilter("all")
  }, [])

  const hasActiveFilters = Boolean(
    debouncedSearchQuery || selectedTags.length > 0 || typeFilter !== "all"
  )

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const addToast = useCallback(
    (title: string, description?: string, variant?: "default" | "destructive") => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, title, description, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    []
  )

  const handleRestoreClick = useCallback((item: ArchiveItem) => {
    setItemToRestore(item)
    setRestoreDialogOpen(true)
    setRestoreError(null)
  }, [])

  const handleRestoreConfirm = useCallback(async () => {
    if (!itemToRestore) return

    setIsRestoring(true)
    setRestoreError(null)

    try {
      const endpoint =
        itemToRestore.type === "topic"
          ? `/api/archive/topics/${itemToRestore.id}/restore`
          : `/api/archive/ideas/${itemToRestore.id}/restore`

      const response = await fetch(endpoint, { method: "POST" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to restore item" }))

        if (errorData.error?.includes("parent topic is archived")) {
          setRestoreError(
            `Cannot restore this idea because its parent topic "${errorData.topic?.name || "Unknown"}" is also archived. Please restore the topic first.`
          )
        } else {
          setRestoreError(errorData.error || "Failed to restore item")
        }
        setIsRestoring(false)
        return
      }

      // Remove from local state
      if (itemToRestore.type === "topic") {
        setTopics((prev) => prev.filter((t) => t.id !== itemToRestore.id))
      } else {
        setIdeas((prev) => prev.filter((i) => i.id !== itemToRestore.id))
      }

      // Show success toast
      addToast(
        "Item restored",
        itemToRestore.type === "topic"
          ? `Topic "${itemToRestore.name}" has been restored.`
          : `Idea "${itemToRestore.name}" has been restored.`,
        "default"
      )

      // Close dialog
      setRestoreDialogOpen(false)
      setItemToRestore(null)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsRestoring(false)
    }
  }, [itemToRestore, addToast])

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialogOpen(false)
    setItemToRestore(null)
    setRestoreError(null)
  }, [])

  const handleDeleteClick = useCallback((item: ArchiveItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
    setDeleteError(null)
    setConfirmText("")
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete || confirmText !== itemToDelete.name) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const endpoint =
        itemToDelete.type === "topic"
          ? `/api/archive/topics/${itemToDelete.id}/permanent-delete`
          : `/api/archive/ideas/${itemToDelete.id}/permanent-delete`

      const response = await fetch(endpoint, { method: "DELETE" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete item" }))
        setDeleteError(errorData.error || "Failed to delete item")
        setIsDeleting(false)
        return
      }

      // Remove from local state
      if (itemToDelete.type === "topic") {
        setTopics((prev) => prev.filter((t) => t.id !== itemToDelete.id))
      } else {
        setIdeas((prev) => prev.filter((i) => i.id !== itemToDelete.id))
      }

      // Show success toast
      addToast(
        "Item permanently deleted",
        itemToDelete.type === "topic"
          ? `Topic "${itemToDelete.name}" has been permanently deleted.`
          : `Idea "${itemToDelete.name}" has been permanently deleted.`,
        "default"
      )

      // Close dialog
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      setConfirmText("")
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsDeleting(false)
    }
  }, [itemToDelete, confirmText, addToast])

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false)
    setItemToDelete(null)
    setDeleteError(null)
    setConfirmText("")
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-muted/40 p-6 hidden lg:block">
        <nav className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/archive">Archive</Link>
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Archive</h1>
            <p className="text-muted-foreground">View and restore archived items</p>
          </header>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive text-lg mb-4">{error}</p>
              <Button onClick={handleRetry}>Retry</Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {debouncedSearchQuery || selectedTags.length > 0 || typeFilter !== "all"
                  ? "No results"
                  : "No archived items"}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={typeFilter}
                      onValueChange={(value) => setTypeFilter(value as ArchiveItemType)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="topics">Topics Only</SelectItem>
                        <SelectItem value="ideas">Ideas Only</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleClearFilters}
                        title="Clear filters"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-muted-foreground">Filter by tags:</span>
                    {allTags.map(({ name, count }) => {
                      const isSelected = selectedTags.includes(name)
                      return (
                        <button
                          key={name}
                          onClick={() => toggleTag(name)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:bg-secondary/50",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/20 text-secondary-foreground"
                          )}
                        >
                          {name}
                          <span
                            className={cn(
                              "text-xs",
                              isSelected ? "text-primary/70" : "text-muted-foreground"
                            )}
                          >
                            ({count})
                          </span>
                          {isSelected && <X className="h-3 w-3" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <ArchiveItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onRestoreClick={handleRestoreClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 lg:hidden">
            <nav className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/">Dashboard</Link>
              </Button>
            </nav>
          </div>
        </div>
      </main>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore {itemToRestore?.type === "topic" ? "Topic" : "Idea"}</DialogTitle>
            <DialogDescription>
              {itemToRestore?.type === "topic" && (
                <>
                  Are you sure you want to restore the topic "{itemToRestore?.name}"? This will also
                  restore all {itemToRestore?.ideaCount || 0} archived{" "}
                  {(itemToRestore as ArchivedTopic)?.ideaCount === 1 ? "idea" : "ideas"} within this
                  topic.
                </>
              )}
              {itemToRestore?.type === "idea" && (
                <>Are you sure you want to restore the idea "{itemToRestore?.name}"?</>
              )}
            </DialogDescription>
          </DialogHeader>

          {itemToRestore && (
            <div className="py-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (itemToRestore.type === "topic"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400")
                    }
                  >
                    {itemToRestore.type === "topic" ? "Topic" : "Idea"}
                  </span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{itemToRestore.name}</h4>
                {itemToRestore.description && (
                  <p className="text-sm text-muted-foreground mb-2">{itemToRestore.description}</p>
                )}
                {itemToRestore.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {itemToRestore.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {restoreError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{restoreError}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleRestoreCancel} disabled={isRestoring}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleRestoreConfirm} disabled={isRestoring}>
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete {itemToDelete?.type === "topic" ? "Topic" : "Idea"}
            </DialogTitle>
            <DialogDescription>
              {itemToDelete?.type === "topic" && (
                <>
                  Are you sure you want to permanently delete the topic "{itemToDelete?.name}"? This
                  action cannot be undone and will also delete all {itemToDelete?.ideaCount || 0}{" "}
                  {(itemToDelete as ArchivedTopic)?.ideaCount === 1 ? "idea" : "ideas"} within this
                  topic.
                </>
              )}
              {itemToDelete?.type === "idea" && (
                <>
                  Are you sure you want to permanently delete the idea "{itemToDelete?.name}"? This
                  action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {itemToDelete && (
            <div className="py-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (itemToDelete.type === "topic"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400")
                    }
                  >
                    {itemToDelete.type === "topic" ? "Topic" : "Idea"}
                  </span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{itemToDelete.name}</h4>
                {itemToDelete.description && (
                  <p className="text-sm text-muted-foreground mb-2">{itemToDelete.description}</p>
                )}
                {itemToDelete.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {itemToDelete.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                <label className="block text-sm font-medium text-destructive mb-2">
                  Type <strong>{itemToDelete.name}</strong> to confirm deletion:
                </label>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={`Type "${itemToDelete.name}" to confirm`}
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {deleteError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || confirmText !== itemToDelete?.name}
            >
              {isDeleting ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <ToastProvider>
        <ToastViewport />
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant}>
            <div className="grid gap-1">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        ))}
      </ToastProvider>
    </div>
  )
}
