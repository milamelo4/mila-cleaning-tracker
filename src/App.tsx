import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Cleanings from "./pages/Cleanings";
import Payments from "./pages/Payments";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import AddClient from "./pages/AddClient";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />

        <Route
          path="/clients"
          element={
            <MainLayout>
              <Clients />
            </MainLayout>
          }
        />

        <Route
          path="/cleanings"
          element={
            <MainLayout>
              <Cleanings />
            </MainLayout>
          }
        />

        <Route
          path="/payments"
          element={
            <MainLayout>
              <Payments />
            </MainLayout>
          }
        />

        <Route
          path="/clients/new"
          element={
            <MainLayout>
              <AddClient />
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;