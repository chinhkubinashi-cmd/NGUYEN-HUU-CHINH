
import React from 'react';
import { StoryProject, AppTab } from '../types';
import { 
  BookOpenIcon, 
  UsersIcon, 
  ListBulletIcon, 
  PlusIcon,
  HomeIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon
} from './Icons';

interface SidebarProps {
  projects: StoryProject[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  currentProjectId, 
  onSelectProject, 
  onNewProject,
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleDarkMode
}) => {
  return (
    <div className="w-72 h-full bg-[#2c241e] text-[#e8dfd8] flex flex-col border-r border-stone-800">
      <div className="p-6">
        <h1 className="text-2xl font-serif font-bold text-amber-100 flex items-center gap-2">
          <span>Nghe & Ngẫm</span>
        </h1>
        <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">Story Studio</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2">
        <button 
          onClick={onNewProject}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-6 transition-colors ${
            activeTab === AppTab.DASHBOARD ? 'bg-amber-900/40 text-amber-100' : 'hover:bg-stone-800'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="font-medium">Tổng quan</span>
        </button>

        {currentProjectId && (
          <div className="mb-8">
            <p className="text-[10px] text-stone-500 font-bold uppercase mb-2 px-4 tracking-widest">Tác phẩm hiện tại</p>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab(AppTab.EDITOR)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  activeTab === AppTab.EDITOR ? 'bg-amber-800 text-white' : 'hover:bg-stone-800'
                }`}
              >
                <BookOpenIcon className="w-5 h-5" />
                <span>Viết truyện</span>
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.OUTLINE)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  activeTab === AppTab.OUTLINE ? 'bg-amber-800 text-white' : 'hover:bg-stone-800'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
                <span>Dàn ý & Chương</span>
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.CHARACTERS)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  activeTab === AppTab.CHARACTERS ? 'bg-amber-800 text-white' : 'hover:bg-stone-800'
                }`}
              >
                <UsersIcon className="w-5 h-5" />
                <span>Nhân vật</span>
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] text-stone-500 font-bold uppercase mb-2 px-4 tracking-widest">Bộ sưu tập</p>
          <div className="space-y-1">
            {projects.map(p => {
              const isCompleted = p.status === 'completed';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`w-full flex items-center justify-between text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    currentProjectId === p.id ? 'text-amber-200 bg-stone-800/50 font-medium' : 'text-stone-400 hover:bg-stone-800'
                  }`}
                  title={`${p.title} (${isCompleted ? 'Đã hoàn thành' : 'Đang sáng tác'})`}
                >
                  <span className="truncate flex-1 mr-2">{p.title}</span>
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} 
                  />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-stone-800 space-y-2">
        {onToggleDarkMode && (
          <button 
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-stone-300 hover:text-white bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50"
            title={isDarkMode ? "Chuyển sang chế độ ban ngày" : "Chuyển sang chế độ ban đêm"}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <SunIcon className="w-5 h-5 text-amber-400" />
              ) : (
                <MoonIcon className="w-5 h-5 text-amber-200" />
              )}
              <span className="font-medium text-sm">
                {isDarkMode ? 'Giao diện Ban ngày' : 'Giao diện Ban đêm'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-700/70 text-amber-200">
              {isDarkMode ? 'Đêm' : 'Ngày'}
            </span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab(AppTab.SETTINGS)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            activeTab === AppTab.SETTINGS ? 'text-amber-100 bg-stone-800' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span className="font-medium text-sm">Cài đặt</span>
        </button>
        <button 
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white py-2.5 rounded-lg transition-colors font-medium shadow-lg"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tác phẩm mới</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
