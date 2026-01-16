import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { Archive } from "@/components/Archive";
import { NewTopic } from "@/components/NewTopic";
import { TopicDetail } from "@/components/TopicDetail";
import { EditTopic } from "@/components/EditTopic";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/topics/new" element={<NewTopic />} />
        <Route path="/topics/:id" element={<TopicDetail />} />
        <Route path="/topics/:id/edit" element={<EditTopic />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
