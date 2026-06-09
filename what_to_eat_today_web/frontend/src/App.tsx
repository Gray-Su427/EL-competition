import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './components/SearchPage';
import AIChat from './components/AIChat';
import CanteensPage from './pages/CanteensPage';
import RecommendedPage from './pages/RecommendedPage';
import CommentsPage from './pages/CommentsPage';
import UserPage from './pages/UserPage';
import LoginPage from './pages/LoginPage';
import DishDetailPage from './pages/DishDetailPage';
import './styles.css';

const App: React.FC = () => (
  <AuthProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/canteens" element={<CanteensPage />} />
        <Route path="/recommended" element={<RecommendedPage />} />
        <Route path="/comments" element={<CommentsPage />} />
        <Route path="/dish/:id" element={<DishDetailPage />} />
        <Route path="/user" element={<UserPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/ai" element={<AIChat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
