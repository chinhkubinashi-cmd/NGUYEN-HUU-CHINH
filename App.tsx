
import React, { useState, useEffect, useCallback } from 'react';
import { StoryProject, AppTab, Character, Chapter } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StoryEditor from './components/StoryEditor';
import CharacterManager from './components/CharacterManager';
import OutlineManager from './components/OutlineManager';
import Settings from './components/Settings';

const App: React.FC = () => {
  // Lazy initialize state from localStorage to prevent overwriting
  const [projects, setProjects] = useState<StoryProject[]>(() => {
    try {
      const saved = localStorage.getItem('van_si_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse projects from localStorage", e);
      return [];
    }
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [autoGenerateOutlineForProject, setAutoGenerateOutlineForProject] = useState<string | null>(null);
  
  // Theme state: dark or light
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('van_si_theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  // Apply dark mode class to <html> element
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('van_si_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('van_si_theme', 'light');
      }
    } catch (e) {
      console.error("Failed to save theme to localStorage", e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Auto-save to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('van_si_projects', JSON.stringify(projects));
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  const createNewProject = (title: string, premise: string, autoGenerateOutline: boolean = false) => {
    const newProject: StoryProject = {
      id: Date.now().toString(),
      title,
      premise,
      setting: 'Việt Nam hiện đại',
      characters: [],
      outline: [],
      chapters: [],
      createdAt: Date.now(),
      status: 'in_progress'
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setActiveTab(AppTab.OUTLINE);
    if (autoGenerateOutline) {
      setAutoGenerateOutlineForProject(newProject.id);
    }
  };

  const updateProject = useCallback((updated: StoryProject) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const handleToggleProjectStatus = (id: string, newStatus?: 'in_progress' | 'completed') => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const nextStatus = newStatus || (p.status === 'completed' ? 'in_progress' : 'completed');
        return { ...p, status: nextStatus, updatedAt: Date.now() };
      }
      return p;
    }));
  };

  const handleImportSingleProject = (importedProject: StoryProject) => {
    setProjects(prev => {
      const existsIndex = prev.findIndex(p => p.id === importedProject.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = { ...importedProject, updatedAt: Date.now() };
        return updated;
      } else {
        return [importedProject, ...prev];
      }
    });
  };

  const deleteProject = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tác phẩm này?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setActiveTab(AppTab.DASHBOARD);
      }
    }
  };

  const handleResetData = () => {
    if (confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu truyện của bạn khỏi trình duyệt. Bạn có chắc chắn không?")) {
      localStorage.removeItem('van_si_projects');
      setProjects([]);
      setCurrentProjectId(null);
      setActiveTab(AppTab.DASHBOARD);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 dark:text-stone-200 bg-[#fdfaf7] dark:bg-[#161412] transition-colors duration-200">
      <Sidebar 
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => {
          setCurrentProjectId(id);
          setActiveTab(AppTab.EDITOR);
        }}
        onNewProject={() => {
          setCurrentProjectId(null);
          setActiveTab(AppTab.DASHBOARD);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      
      <main className="flex-1 flex flex-col bg-[#fdfaf7] dark:bg-[#161412] relative overflow-hidden transition-colors duration-200">
        {activeTab === AppTab.DASHBOARD && (
          <Dashboard 
            onCreate={createNewProject} 
            projects={projects}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              setActiveTab(AppTab.EDITOR);
            }}
            onDelete={deleteProject}
            onToggleStatus={handleToggleProjectStatus}
            onImportProject={handleImportSingleProject}
          />
        )}
        
        {currentProject && activeTab === AppTab.EDITOR && (
          <StoryEditor 
            project={currentProject} 
            onUpdate={updateProject} 
          />
        )}

        {currentProject && activeTab === AppTab.CHARACTERS && (
          <CharacterManager 
            project={currentProject} 
            onUpdate={updateProject} 
          />
        )}

        {currentProject && activeTab === AppTab.OUTLINE && (
          <OutlineManager 
            project={currentProject} 
            onUpdate={updateProject} 
            autoGenerate={autoGenerateOutlineForProject === currentProject.id}
            onAutoGenerateComplete={() => setAutoGenerateOutlineForProject(null)}
          />
        )}

        {activeTab === AppTab.SETTINGS && (
          <Settings 
            projects={projects}
            onReset={handleResetData} 
            onImport={(imported) => setProjects(imported)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        )}
      </main>
    </div>
  );
};

export default App;
