import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>()
  const _navigate = useNavigate()
  const [idea, setIdea] = useState<{
    id: string
    topicId: string
    topicName: string
    name: string
    description: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
          <header className="mb-8">
            <Link
              to={`/topics/${idea.topicId}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to {idea.topicName}
            </Link>
            <h1 className="text-3xl font-bold mt-2">{idea.name}</h1>
            {idea.description && <p className="text-muted-foreground mt-2">{idea.description}</p>}
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Idea Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Topic</h3>
                <p>{idea.topicName}</p>
              </div>
              {idea.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tags</h3>
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
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Created: {new Date(idea.createdAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
