import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { ArchivedTopic, ArchivedIdea, ArchiveItemType } from "@/lib/types"
import { cn } from "@/lib/utils"

type ArchiveItem = (ArchivedTopic & { type: "topic" }) | (ArchivedIdea & { type: "idea" })

function ArchiveItemCard({ item }: { item: ArchiveItem }) {
  const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader>
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
            {item.description && <CardDescription className="mt-2">{item.description}</CardDescription>}
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
        <p className="text-sm text-muted-foreground">
          {item.type === "topic" ? (
            <>
              {item.ideaCount} {item.ideaCount === 1 ? "idea" : "ideas"} · Archived {formattedDate}
            </>
          ) : (
            <>Archived {formattedDate}</>
          )}
        </p>
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
      items = items.filter((item) =>
        selectedTags.every((tag) => item.tags.includes(tag))
      )
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
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    )
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
                          <span className={cn(
                            "text-xs",
                            isSelected ? "text-primary/70" : "text-muted-foreground"
                          )}>
                            ({count})
                          </span>
                          {isSelected && (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <ArchiveItemCard key={`${item.type}-${item.id}`} item={item} />
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
    </div>
  )
}
