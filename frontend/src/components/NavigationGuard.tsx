import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore, useNavigationFlow } from '../stores';

interface NavigationGuardProps {
  children: React.ReactNode;
  fallbackPath: string;
}

const NavigationGuard: React.FC<NavigationGuardProps> = ({
  children,
  fallbackPath,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { validateFlow, setPendingNavigation, resolvePendingNavigation } =
    useNavigationStore();
  const flow = useNavigationFlow();

  useEffect(() => {
    const currentPath = location.pathname;

    // Validate if user can access this step
    const isValid = validateFlow();

    if (!isValid) {
      console.log(
        `[NavigationGuard] Invalid flow for ${currentPath}, redirecting to ${fallbackPath}`
      );

      // Save pending navigation for after flow completion
      setPendingNavigation(currentPath);

      // Redirect to fallback path
      navigate(fallbackPath, { replace: true });
      return;
    }

    // Check for pending navigation and resolve if flow is now valid
    const pendingPath = resolvePendingNavigation();
    if (pendingPath && pendingPath !== currentPath) {
      console.log(
        `[NavigationGuard] Resolving pending navigation to ${pendingPath}`
      );
      navigate(pendingPath, { replace: true });
    }
  }, [
    location.pathname,
    flow,
    validateFlow,
    setPendingNavigation,
    resolvePendingNavigation,
    navigate,
    fallbackPath,
  ]);

  return <>{children}</>;
};

export default NavigationGuard;
