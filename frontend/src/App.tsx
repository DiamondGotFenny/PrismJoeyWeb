import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import DifficultySelectionPage from './pages/DifficultySelectionPage';
import PracticePage from './pages/PracticePage'; // Import the PracticePage
import './App.css'; 

// Placeholder for a summary page - can be developed later
const PracticeSummaryPagePlaceholder: React.FC = () => {
  const location = useLocation();
  const sessionId = location.state?.sessionId;
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>练习总结</h1>
      <p>练习ID: {sessionId || 'N/A'}</p>
      <p>这里将显示详细的练习总结信息。</p>
      <button onClick={() => window.history.back()}>返回</button>
    </div>
  );
};


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/difficulty-selection" element={<DifficultySelectionPage />} />
        {/* 
          The DifficultySelectionPage navigates to '/practice-start-placeholder' with state.
          We should change this to directly navigate to '/practice' and let PracticePage handle
          the state. Or, create a route that PracticePage uses.
          For now, let's assume PracticePage is designed to be hit directly via a route like '/practice'
          and expects state from navigation.
          The `PracticePage.tsx` uses `useLocation()` to get state, so this setup is fine.
          The route that `DifficultySelectionPage` navigates to needs to match the route for `PracticePage`.
        */}
        <Route path="/practice" element={<PracticePage />} /> 
        {/* The above route '/practice' should be what DifficultySelectionPage navigates to. */}
        
        {/* Add a route for the summary page, which PracticePage navigates to */}
        <Route path="/summary" element={<PracticeSummaryPagePlaceholder />} />

        {/* Redirect any unknown paths to WelcomePage or a 404 component */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
export default App;
// Need to import useLocation in App.tsx if PracticeSummaryPagePlaceholder is kept here.
// For cleaner structure, PracticeSummaryPagePlaceholder should be in its own file.
// Let's remove the direct use of useLocation in App.tsx by preparing for a separate summary page.
// The placeholder can be simplified if not using useLocation directly in App.tsx.
// For now, the placeholder is fine as it is, but for future, move it.
// The crucial part is routing to PracticePage.
