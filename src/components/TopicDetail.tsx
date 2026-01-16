import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const res = await fetch("/api/topics");
        if (res.ok) {
          const topics = await res.json();
          const found = topics.find((t: { id: string }) => t.id === id);
          if (found) {
            setTopic(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [id]);

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
    );
  }

  if (!topic) {
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
    );
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
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{topic.name}</h1>
            {topic.description && <p className="text-muted-foreground mt-2">{topic.description}</p>}
          </header>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Topic created successfully. Idea list and topic details coming soon.
            </p>
            <Button asChild>
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
