import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Topic } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const response = await fetch("/api/topics");
        if (!response.ok) {
          throw new Error("Failed to fetch topics");
        }
        const data = await response.json();
        setTopics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTopics();
  }, []);

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
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Topics</h1>
              <p className="text-muted-foreground">Manage your topics and ideas</p>
            </div>
            <Button asChild>
              <Link to="/topics/new">New Topic</Link>
            </Button>
          </header>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading topics...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No topics yet</p>
              <Button asChild>
                <Link to="/topics/new">Create your first topic</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map(topic => (
                <Link key={topic.id} to={`/topics/${topic.id}`}>
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-xl">{topic.name}</CardTitle>
                      {topic.description && <CardDescription>{topic.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {topic.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {topic.ideaCount} {topic.ideaCount === 1 ? "idea" : "ideas"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 lg:hidden">
            <nav className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/archive">Archive</Link>
              </Button>
            </nav>
          </div>
        </div>
      </main>
    </div>
  );
}
