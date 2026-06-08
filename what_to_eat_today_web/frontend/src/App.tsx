import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './components/SearchPage';
import AIChat from './components/AIChat';
import './styles.css';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/ai" element={<AIChat />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
