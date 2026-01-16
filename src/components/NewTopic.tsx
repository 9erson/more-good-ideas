import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NewTopic() {
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
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">New Topic</h1>
            <p className="text-muted-foreground">Create a new topic</p>
          </header>
          <div className="text-center py-12">
            <p className="text-muted-foreground">New topic form coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
