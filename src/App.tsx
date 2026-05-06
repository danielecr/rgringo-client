import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Connect from "@/pages/Connect";
import Folders from "@/pages/Folders";
import Entries from "@/pages/Entries";
import Editor from "@/pages/Editor";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/connect" replace />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/folders" element={<Folders />} />
        <Route path="/entries" element={<Entries />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}
