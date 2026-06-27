import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Cleanings from "./pages/Cleanings";
import Payments from "./pages/Payments";
import MainLayout from "./layouts/MainLayout";

import AddClient from "./pages/AddClient";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/cleanings" element={<Cleanings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/clients/new" element={<AddClient />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;MainLayout