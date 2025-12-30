import { useState, useEffect, useCallback } from 'react';

export function useProject() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selected_project_id');
    if (stored) {
      setSelectedProjectId(stored);
    }
    setIsLoading(false);
  }, []);

  const selectProject = useCallback((projectId: string) => {
    localStorage.setItem('selected_project_id', projectId);
    setSelectedProjectId(projectId);
  }, []);

  const clearProject = useCallback(() => {
    localStorage.removeItem('selected_project_id');
    setSelectedProjectId(null);
  }, []);

  return {
    selectedProjectId,
    selectProject,
    clearProject,
    hasProject: selectedProjectId !== null,
    isLoading,
  };
}
