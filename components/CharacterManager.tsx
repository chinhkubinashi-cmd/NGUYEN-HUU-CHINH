
import React, { useState } from 'react';
import { StoryProject, Character } from '../types';
import { PlusIcon, UserIcon, TrashIcon, SparklesIcon, SaveIcon } from './Icons';

interface CharacterManagerProps {
  project: StoryProject;
  onUpdate: (updated: StoryProject) => void;
}

const CharacterManager: React.FC<CharacterManagerProps> = ({ project, onUpdate }) => {
  const [newChar, setNewChar] = useState<Partial<Character>>({});
  const [statusMessage, setStatusMessage] = useState('');

  const handleManualSave = () => {
    setStatusMessage('Đã lưu nhân vật.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAdd = () => {
    const char: Character = {
      id: Date.now().toString(),
      name: newChar.name || 'Nhân vật mới',
      role: newChar.role || 'Vai trò',
      personality: newChar.personality || '',
      pastPain: newChar.pastPain || '',
      currentDesire: newChar.currentDesire || '',
      internalConflict: newChar.internalConflict || ''
    };
    onUpdate({ ...project, characters: [...project.characters, char] });
    setNewChar({});
  };

  const handleDelete = (id: string) => {
    onUpdate({ ...project, characters: project.characters.filter(c => c.id !== id) });
  };

  const handleEdit = (id: string, updates: Partial<Character>) => {
    onUpdate({
      ...project,
      characters: project.characters.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#fdfaf7] dark:bg-[#161412] transition-colors duration-200">
      <header className="mb-12 max-w-5xl mx-auto flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-3">Thế giới quan & Nhân sinh</h2>
          <p className="text-stone-500 dark:text-stone-400 italic">"Mỗi con người là một cuốn tiểu thuyết chưa được mở ra."</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-serif italic animate-pulse">{statusMessage}</span>
          <button 
            onClick={handleManualSave}
            className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 px-6 py-3 rounded-full hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-sm shadow-sm group"
          >
            <SaveIcon className="w-4 h-4 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            Lưu nhân vật
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 gap-10">
        {project.characters.map(char => (
          <div key={char.id} className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col md:flex-row gap-8 relative group">
            <div className="md:w-1/3 space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-amber-100 dark:bg-amber-900/60 p-3 rounded-2xl text-amber-800 dark:text-amber-300">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <input 
                    value={char.name}
                    onChange={(e) => handleEdit(char.id, { name: e.target.value })}
                    className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 bg-transparent w-full focus:outline-none focus:border-b border-amber-200 dark:border-amber-700"
                  />
                  <input 
                    value={char.role}
                    onChange={(e) => handleEdit(char.id, { role: e.target.value })}
                    className="block text-sm text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mt-1 bg-transparent w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest block mb-2">Tính cách chủ đạo</label>
                <textarea 
                  value={char.personality}
                  onChange={(e) => handleEdit(char.id, { personality: e.target.value })}
                  className="w-full text-sm text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 rounded-2xl p-4 h-32 focus:outline-none resize-none leading-relaxed border border-transparent focus:border-stone-200 dark:focus:border-stone-700"
                  placeholder="Điểm mạnh, yếu, thói quen..."
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50/30 dark:bg-red-950/20 p-6 rounded-2xl border border-red-100/50 dark:border-red-900/30">
                <label className="text-[10px] font-bold text-red-400 dark:text-red-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Nỗi đau & Vết thương cũ
                </label>
                <textarea 
                  value={char.pastPain}
                  onChange={(e) => handleEdit(char.id, { pastPain: e.target.value })}
                  className="w-full text-sm text-stone-700 dark:text-stone-200 bg-transparent h-40 focus:outline-none resize-none italic leading-relaxed"
                  placeholder="Điều gì ám ảnh nhân vật trong quá khứ?..."
                />
              </div>
              <div className="bg-emerald-50/30 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                <label className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Khát khao hiện tại
                </label>
                <textarea 
                  value={char.currentDesire}
                  onChange={(e) => handleEdit(char.id, { currentDesire: e.target.value })}
                  className="w-full text-sm text-stone-700 dark:text-stone-200 bg-transparent h-40 focus:outline-none resize-none italic leading-relaxed"
                  placeholder="Nhân vật thực sự muốn điều gì lúc này?..."
                />
              </div>
            </div>

            <button 
              onClick={() => handleDelete(char.id)} 
              className="absolute top-6 right-6 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
        ))}

        <button 
          onClick={handleAdd}
          className="bg-white dark:bg-stone-900 border-2 border-dashed border-stone-200 dark:border-stone-800 p-8 rounded-3xl text-stone-400 dark:text-stone-500 font-bold hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-800 dark:hover:text-amber-400 transition-all flex items-center justify-center gap-4"
        >
          <PlusIcon className="w-6 h-6" />
          Mời một nhân vật mới bước vào câu chuyện
        </button>
      </div>
    </div>
  );
};

export default CharacterManager;
