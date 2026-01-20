import { Edit, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StarRating } from "@/components/ui/star-rating"

interface Feedback {
  rating: number
  notes?: string
}

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [idea, setIdea] = useState<{
    id: string
    topicId: string
    topicName: string
    name: string
    description: string | null
    tags: string[]
    feedback?: Feedback
    createdAt: string
    updatedAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIdea = async () => {
      try {
        const res = await fetch(`/api/ideas/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          setIdea(null)
        } else if (res.ok) {
          const data = await res.json()
          setIdea(data)
        }
      } catch (err) {
        console.error("Failed to fetch idea:", err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchIdea()
  }, [id])

  const handleDelete = async () => {
    if (!idea) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const apiKey = localStorage.getItem("apiKey")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (apiKey) {
        headers["X-API-Key"] = apiKey
      }

      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "DELETE",
        headers,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete idea")
      }

      navigate(`/topics/${idea.topicId}`)
    } catch (err) {
      console.error("Failed to delete idea:", err)
      setDeleteError(err instanceof Error ? err.message : "Failed to delete idea")
      setIsDeleting(false)
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

  if (notFound || !idea) {
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
          <p>Idea not found</p>
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
              <Link
                to={`/topics/${idea.topicId}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to {idea.topicName}
              </Link>
              <h1 className="text-3xl font-bold mt-2">{idea.name}</h1>
              {idea.description && <p className="text-muted-foreground mt-2">{idea.description}</p>}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
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
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to={`/ideas/${idea.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Idea
                </Link>
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Idea
              </Button>
            </div>
          </header>

          <div className="space-y-6">
            {/* Feedback Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Feedback</CardTitle>
                  {idea.feedback ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/ideas/${idea.id}/feedback`}>Edit Feedback</Link>
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <Link to={`/ideas/${idea.id}/feedback`}>Add Feedback</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {idea.feedback ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Rating</h3>
                      <StarRating value={idea.feedback.rating} readonly size="lg" />
                    </div>
                    {idea.feedback.notes && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
                        <p className="text-sm">{idea.feedback.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No feedback yet</p>
                )}
              </CardContent>
            </Card>

            {/* Idea Details */}
            <Card>
              <CardHeader>
                <CardTitle>Idea Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Topic</h3>
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <Link to={`/topics/${idea.topicId}`}>{idea.topicName}</Link>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Created: {new Date(idea.createdAt).toLocaleString()}</div>
                  <div>Updated: {new Date(idea.updatedAt).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{idea?.name}"? This will archive the idea. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {deleteError}
            </div>
          )}
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
