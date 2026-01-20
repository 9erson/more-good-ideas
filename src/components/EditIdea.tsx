import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Topic = {
  id: string
  name: string
  description: string | null
}

export function EditIdea() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [topicId, setTopicId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [filteredTags, setFilteredTags] = useState<string[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ideaRes, topicsRes, tagsRes] = await Promise.all([
          fetch(`/api/ideas/${id}`),
          fetch("/api/topics"),
          fetch("/api/tags"),
        ])

        if (ideaRes.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }

        if (ideaRes.ok) {
          const ideaData = await ideaRes.json()
          setTopicId(ideaData.topicId)
          setName(ideaData.name)
          setDescription(ideaData.description || "")
          setTags(ideaData.tags || [])
        }

        if (topicsRes.ok) {
          const topicsData = await topicsRes.json()
          setTopics(topicsData)
        }

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setExistingTags(tagsData)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleTagInputChange = (value: string) => {
    setTagInput(value)
    if (value.trim()) {
      const filtered = existingTags.filter(
        (tag) => tag.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tag)
      )
      setFilteredTags(filtered)
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    const hasTag = tags.some((t) => t.toLowerCase() === normalizedTag)

    if (!hasTag && normalizedTag) {
      setTags([...tags, tag.trim()])
    }
    setTagInput("")
    setShowAutocomplete(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!topicId) {
      setError("Topic is required")
      return
    }

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicId,
          name: name.trim(),
          description: description.trim() || null,
          tags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update idea")
      }

      navigate(`/ideas/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update idea")
      setIsSubmitting(false)
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

  if (notFound) {
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
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to={`/ideas/${id}`}>Back to Idea</Link>
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Edit Idea</h1>
            <p className="text-muted-foreground">Update idea details or move to a different topic</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className={error && !topicId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Idea name"
                className={error && !name.trim() ? "border-destructive" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this idea"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="relative">
                <Input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault()
                      handleAddTag(tagInput)
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="pr-4"
                />
                {showAutocomplete && filteredTags.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleAddTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </ul>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={`/ideas/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
