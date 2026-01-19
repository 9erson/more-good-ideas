import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
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
import type { Idea } from "@/lib/types"

export function TopicDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<{
    id: string
    name: string
    description: string | null
    tags: string[]
    ideas: Idea[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const res = await fetch(`/api/topics/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          setTopic(null)
        } else if (res.ok) {
          const data = await res.json()
          setTopic(data)
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchTopic()
  }, [id])

  const handleDelete = async () => {
    if (!topic) return

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete topic")
      }

      navigate("/")
    } catch (err) {
      console.error("Failed to delete topic:", err)
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-border bg-muted/40 p-6 hidden lg:block">
          <nav className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
          </nav>
        </aside>
        <main className="flex-1 p-6 md:p-8">
          <p>Loading...</p>
        </main>
      </div>
    )
  }

  if (notFound || !topic) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-border bg-muted/40 p-6 hidden lg:block">
          <nav className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
          </nav>
        </aside>
        <main className="flex-1 p-6 md:p-8">
          <p>Topic not found</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-muted/40 p-6 hidden lg:block">
        <nav className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/">Dashboard</Link>
          </Button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{topic.name}</h1>
              {topic.description && (
                <p className="text-muted-foreground mt-2">{topic.description}</p>
              )}
              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to={`/ideas/new?topicId=${topic.id}`}>New Idea</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/topics/${topic.id}/edit`}>Edit Topic</Link>
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                Delete Topic
              </Button>
            </div>
          </header>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Ideas ({topic.ideas.length})</h2>

            {topic.ideas.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <p className="text-muted-foreground text-lg mb-4">No ideas yet</p>
                <Button asChild>
                  <Link to={`/ideas/new?topicId=${topic.id}`}>Add your first idea</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {topic.ideas.map((idea) => (
                  <Link key={idea.id} to={`/ideas/${idea.id}`}>
                    <Card className="transition-all hover:shadow-md hover:border-primary cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{idea.name}</CardTitle>
                            {idea.description && (
                              <CardDescription className="mt-1">{idea.description}</CardDescription>
                            )}
                          </div>
                          {idea.feedback && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <span>{"★".repeat(idea.feedback.rating)}</span>
                              <span className="text-muted-foreground text-sm">
                                ({idea.feedback.rating}/5)
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {idea.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{topic?.name}"? This will archive the topic and all
              its ideas. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
