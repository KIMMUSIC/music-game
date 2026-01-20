import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import NicknameSetup from './pages/NicknameSetup';
import Profile from './pages/Profile';
import Home from './pages/Home';
import MyQuizzes from './pages/MyQuizzes';
import QuizCreate from './pages/QuizCreate';
import QuizDetail from './pages/QuizDetail';
import QuizEdit from './pages/QuizEdit';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import RoomLobby from './pages/RoomLobby';
import GamePlay from './pages/GamePlay';
import GameResults from './pages/GameResults';
import GameHistory from './pages/GameHistory';
import GameHistoryDetail from './pages/GameHistoryDetail';
import Leaderboard from './pages/Leaderboard';
import Friends from './pages/Friends';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nickname-setup"
          element={
            <ProtectedRoute>
              <NicknameSetup />
            </ProtectedRoute>
          }
        />

        {/* Quiz routes */}
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute>
              <MyQuizzes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/create"
          element={
            <ProtectedRoute>
              <QuizCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:id"
          element={
            <ProtectedRoute>
              <QuizDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:id/edit"
          element={
            <ProtectedRoute>
              <QuizEdit />
            </ProtectedRoute>
          }
        />

        {/* Room routes */}
        <Route
          path="/room/create"
          element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/join"
          element={
            <ProtectedRoute>
              <JoinRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:id"
          element={
            <ProtectedRoute>
              <RoomLobby />
            </ProtectedRoute>
          }
        />

        {/* Game routes */}
        <Route
          path="/game/:id"
          element={
            <ProtectedRoute>
              <GamePlay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <GameResults />
            </ProtectedRoute>
          }
        />

        {/* History routes */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <GameHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history/:id"
          element={
            <ProtectedRoute>
              <GameHistoryDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        {/* Friends routes */}
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
