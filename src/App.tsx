import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Cleanings from "./pages/Cleanings";
import Payments from "./pages/Payments";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import AddClient from "./pages/AddClient";
import ClientDetails from "./pages/ClientDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute>
            <MainLayout>
              <Clients />
            </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cleanings"
          element={
            <ProtectedRoute>
            <MainLayout>
              <Cleanings />
            </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute>
            <MainLayout>
              <Payments />
            </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/new"
          element={
            <ProtectedRoute>
            <MainLayout>
              <AddClient />
            </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:clientId"
          element={
            <ProtectedRoute>
            <MainLayout>
              <ClientDetails />
            </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;