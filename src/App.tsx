import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Archive } from "@/components/Archive"
import { Dashboard } from "@/components/Dashboard"
import { EditIdea } from "@/components/EditIdea"
import { EditTopic } from "@/components/EditTopic"
import { IdeaDetail } from "@/components/IdeaDetail"
import { NewIdea } from "@/components/NewIdea"
import { NewTopic } from "@/components/NewTopic"
import { TopicDetail } from "@/components/TopicDetail"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/topics/new" element={<NewTopic />} />
        <Route path="/topics/:id" element={<TopicDetail />} />
        <Route path="/topics/:id/edit" element={<EditTopic />} />
        <Route path="/ideas/new" element={<NewIdea />} />
        <Route path="/ideas/:id" element={<IdeaDetail />} />
        <Route path="/ideas/:id/edit" element={<EditIdea />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
