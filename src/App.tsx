
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import CreateSessionPage from './pages/CreateSessionPage';
import SessionPage from './pages/SessionPage';
import JoinSessionPage from './pages/JoinSessionPage';
import NotFoundPage from './pages/NotFoundPage';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="checkplease-theme">
      <Router>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateSessionPage />} />
          <Route path="/session/:billId" element={<SessionPage />} />
          <Route path="/join/:billId" element={<JoinSessionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;