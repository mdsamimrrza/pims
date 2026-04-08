import { Navigate, Route, Routes } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Login from './pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppRoutes />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}