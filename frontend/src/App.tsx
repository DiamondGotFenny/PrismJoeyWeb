import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import GradeSelectionPage from './pages/GradeSelectionPage';
import SubjectSelectionPage from './pages/SubjectSelectionPage';
import SubjectOptionsPage from './pages/SubjectOptionsPage';
import EnglishDevelopmentPage from './pages/EnglishDevelopmentPage';
import GeneralKnowledgeDevelopmentPage from './pages/GeneralKnowledgeDevelopmentPage';
import DifficultySelectionPage from './pages/DifficultySelectionPage';
import ExerciseSessionPage from './pages/ExerciseSessionPage';
import ExerciseResultPage from './pages/ExerciseResultPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />

        {/* New Nested Routes */}
        <Route path="/grades" element={<GradeSelectionPage />} />
        <Route
          path="/grades/:gradeId/subjects"
          element={<SubjectSelectionPage />}
        />
        <Route
          path="/grades/:gradeId/subjects/:subjectId"
          element={<SubjectOptionsPage />}
        />
        <Route
          path="/grades/:gradeId/subjects/:subjectId/practice/difficulty"
          element={<DifficultySelectionPage />}
        />
        <Route
          path="/grades/:gradeId/subjects/:subjectId/practice/session"
          element={<ExerciseSessionPage />}
        />
        <Route
          path="/grades/:gradeId/subjects/:subjectId/practice/result"
          element={<ExerciseResultPage />}
        />

        {/* Development pages - keep them for now */}
        <Route
          path="/english-development"
          element={<EnglishDevelopmentPage />}
        />
        <Route
          path="/general-knowledge-development"
          element={<GeneralKnowledgeDevelopmentPage />}
        />

        {/* Old routes - redirect to new structure or remove */}
        <Route
          path="/grade-selection"
          element={<Navigate to="/grades" replace />}
        />
        <Route
          path="/subject-selection"
          element={<Navigate to="/grades" replace />}
        />
        <Route
          path="/mathematics-options"
          element={<Navigate to="/grades" replace />}
        />
        <Route
          path="/difficulty-selection"
          element={<Navigate to="/grades" replace />}
        />
        <Route path="/practice" element={<Navigate to="/grades" replace />} />
        <Route path="/result" element={<Navigate to="/grades" replace />} />

        {/* Redirect any unknown paths to WelcomePage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
export default App;
