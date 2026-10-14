
import React, { useState, useRef, useEffect } from 'react';
import { StoryProject, Chapter, Character } from '../types';
import { generateOutline, generateNextChapterOutline, critiqueChapterOutline, addDramaToChapterOutline } from '../services/geminiService';
import { SparklesIcon, PlusIcon, TrashIcon, LightBulbIcon, ChatBubbleLeftEllipsisIcon, SaveIcon } from './Icons';

interface OutlineManagerProps {
  project: StoryProject;
  onUpdate: (updated: StoryProject) => void;
  autoGenerate?: boolean;
  onAutoGenerateComplete?: () => void;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none ${className}`}
      rows={1}
    />
  );
};

const OutlineManager: React.FC<OutlineManagerProps> = ({ project, onUpdate, autoGenerate, onAutoGenerateComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingNext, setIsSuggestingNext] = useState(false);
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
  const [critiqueResults, setCritiqueResults] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const handleManualSave = () => {
    setStatusMessage('Đã lưu dàn ý.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleGenerateOutline = async (skipConfirm: boolean = false) => {
    if (project.chapters.length > 0 && !autoGenerate && !skipConfirm) {
      setShowRegenConfirm(true);
      return;
    }
    
    setShowRegenConfirm(false);
    setIsGenerating(true);
    setErrorMessage('');
    try {
      console.log("Generating outline for:", project.title);
      const outlineRaw = await generateOutline(project.title, project.premise);
      
      const jsonStr = outlineRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonStr);
      
      const newChapters: Chapter[] = parsedData.chapters.map((chap: any, idx: number) => ({
        id: Date.now().toString() + idx,
        title: chap.title || `Chương ${idx + 1}`,
        summary: chap.summary || '',
        content: '',
        emotionalTone: chap.emotionalTone || 'Bình thản'
      }));
      
      const newCharacters: Character[] = parsedData.characters.map((char: any, idx: number) => ({
        id: Date.now().toString() + idx + 1000,
        name: char.name,
        role: char.role,
        personality: char.personality,
        pastPain: char.pastPain,
        currentDesire: char.currentDesire,
        internalConflict: char.internalConflict
      }));
      
      onUpdate({ ...project, chapters: newChapters, characters: newCharacters });
      setStatusMessage('Đã cập nhật dàn ý mới.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error("Error in handleGenerateOutline:", error);
      setErrorMessage("Lỗi khi tạo dàn ý. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
      if (onAutoGenerateComplete) onAutoGenerateComplete();
    }
  };

  useEffect(() => {
    if (autoGenerate) {
      handleGenerateOutline(true);
    }
  }, [autoGenerate]);

  const handleSuggestNext = async () => {
    setIsSuggestingNext(true);
    setErrorMessage('');
    try {
      const result = await generateNextChapterOutline(project);
      
      const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedChapter = JSON.parse(jsonStr);

      const newChapter: Chapter = {
        id: Date.now().toString(),
        title: parsedChapter.title || 'Chương mới (AI)',
        summary: parsedChapter.summary || '',
        content: '',
        emotionalTone: parsedChapter.emotionalTone || 'Bình thản'
      };

      onUpdate({ ...project, chapters: [...project.chapters, newChapter] });
      setStatusMessage('Đã thêm chương mới.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage("AI đang bí ý tưởng. Hãy thử lại sau.");
    } finally {
      setIsSuggestingNext(false);
    }
  };

  const handleCritique = async (chapterIndex: number) => {
    const chapter = project.chapters[chapterIndex];
    setLoadingChapterId(`critique-${chapter.id}`);
    setErrorMessage('');
    try {
      const critique = await critiqueChapterOutline(project, chapterIndex);
      setCritiqueResults(prev => ({ ...prev, [chapter.id]: critique }));
    } catch (error) {
      console.error(error);
      setErrorMessage("Lỗi khi nhận xét dàn ý.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const handleAddDrama = async (chapterIndex: number) => {
    const chapter = project.chapters[chapterIndex];
    setLoadingChapterId(`drama-${chapter.id}`);
    setErrorMessage('');
    try {
      const resultRaw = await addDramaToChapterOutline(project, chapterIndex);
      const jsonStr = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonStr);
      
      updateChapter(chapter.id, { 
        summary: parsedData.summary,
        emotionalTone: parsedData.emotionalTone || chapter.emotionalTone
      });
      setStatusMessage('Đã thêm drama cho chương.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage("Lỗi khi thêm drama.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const addChapter = () => {
    const newChap: Chapter = {
      id: Date.now().toString(),
      title: 'Chương mới',
      summary: '',
      content: '',
      emotionalTone: 'Bình thản'
    };
    onUpdate({ ...project, chapters: [...project.chapters, newChap] });
  };

  const deleteChapter = (id: string) => {
    onUpdate({ ...project, chapters: project.chapters.filter(c => c.id !== id) });
  };

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    onUpdate({
      ...project,
      chapters: project.chapters.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#fdfaf7] dark:bg-[#161412] transition-colors duration-200">
      <header className="mb-10 max-w-4xl mx-auto flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-2">Dàn ý & Phân chương</h2>
          <p className="text-stone-500 dark:text-stone-400">Bản đồ cho hành trình 90 phút lắng đọng.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-serif italic animate-pulse">{statusMessage}</span>
          <button 
            onClick={handleManualSave}
            className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 px-6 py-3 rounded-full hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-sm shadow-sm group"
          >
            <SaveIcon className="w-4 h-4 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            Lưu dàn ý
          </button>
          <button 
            onClick={() => handleGenerateOutline()}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-200 border dark:border-stone-700 px-6 py-3 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 transition-all font-bold text-sm"
          >
            <SparklesIcon className="w-4 h-4" />
            {isGenerating ? 'Đang phác thảo...' : 'Lập lại toàn bộ dàn ý'}
          </button>
        </div>
      </header>

      {showRegenConfirm && (
        <div className="max-w-4xl mx-auto mb-8 p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">Xác nhận lập lại dàn ý?</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">Hành động này sẽ ghi đè toàn bộ các chương hiện có.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowRegenConfirm(false)}
              className="px-4 py-2 text-sm font-bold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={() => handleGenerateOutline(true)}
              className="px-6 py-2 bg-amber-800 dark:bg-amber-700 text-white rounded-full text-sm font-bold hover:bg-amber-900 dark:hover:bg-amber-600 shadow-md"
            >
              Đồng ý ghi đè
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-4xl mx-auto mb-8 p-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-between">
          <p className="text-sm font-medium">{errorMessage}</p>
          <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
            <PlusIcon className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto pb-20">
        {project.chapters.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-20 text-center border border-stone-100 dark:border-stone-800 shadow-sm">
            <p className="text-stone-400 dark:text-stone-500 mb-6 italic">Hãy bắt đầu bằng cách để AI hỗ trợ lập dàn ý hoặc thêm chương thủ công.</p>
            <div className="flex justify-center gap-4">
               <button 
                onClick={handleGenerateOutline}
                className="bg-amber-800 dark:bg-amber-700 text-white px-8 py-2 rounded-full font-bold hover:bg-amber-900 dark:hover:bg-amber-600 shadow-lg"
              >
                Tự động tạo dàn ý
              </button>
              <button 
                onClick={addChapter}
                className="text-amber-800 dark:text-amber-400 border-2 border-amber-800 dark:border-amber-600 px-8 py-2 rounded-full font-bold hover:bg-amber-50 dark:hover:bg-stone-800"
              >
                + Thêm thủ công
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 p-10 md:p-16 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
            <h3 className="font-serif font-bold text-2xl text-stone-800 dark:text-stone-100 mb-4 uppercase tracking-wide">
              DÀN Ý CHI TIẾT: {project.title}
            </h3>
            
            <div className="mb-10 text-stone-600 dark:text-stone-300 leading-relaxed">
              <p><strong className="text-stone-800 dark:text-stone-100">Bối cảnh chính:</strong> {project.setting}</p>
              <p><strong className="text-stone-800 dark:text-stone-100">Cốt truyện:</strong> {project.premise}</p>
            </div>

            <div className="space-y-10">
              {project.chapters.map((chap, idx) => (
                <div key={chap.id} className="relative group pl-6 border-l-2 border-stone-100 dark:border-stone-800 hover:border-amber-200 dark:hover:border-amber-700 transition-colors">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 group-hover:border-amber-400 dark:group-hover:border-amber-500 transition-colors"></div>
                  
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-bold text-lg text-stone-800 dark:text-stone-100 whitespace-nowrap">Chương {idx + 1}:</span>
                      <input 
                        value={chap.title}
                        onChange={(e) => updateChapter(chap.id, { title: e.target.value })}
                        className="font-bold text-lg text-stone-800 dark:text-stone-100 bg-transparent border-none outline-none flex-1 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                        placeholder="Tên chương..."
                      />
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button 
                        onClick={() => handleCritique(idx)}
                        disabled={loadingChapterId !== null}
                        className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title="Nhận xét dàn ý chương này"
                      >
                        <ChatBubbleLeftEllipsisIcon className="w-3 h-3" />
                        {loadingChapterId === `critique-${chap.id}` ? 'Đang xét...' : 'Phê bình'}
                      </button>
                      <button 
                        onClick={() => handleAddDrama(idx)}
                        disabled={loadingChapterId !== null}
                        className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title="Thêm biến cố/xung đột để cuốn hút hơn"
                      >
                        <SparklesIcon className="w-3 h-3" />
                        {loadingChapterId === `drama-${chap.id}` ? 'Đang thêm...' : 'Tạo Drama'}
                      </button>
                      <button 
                        onClick={() => deleteChapter(chap.id)} 
                        className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors"
                        title="Xóa chương"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <AutoResizeTextarea
                    value={chap.summary}
                    onChange={(e) => updateChapter(chap.id, { summary: e })}
                    className="text-stone-600 dark:text-stone-300 leading-relaxed min-h-[60px]"
                    placeholder="Nhập dàn ý chi tiết cho chương này (hỗ trợ gạch đầu dòng)..."
                  />

                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Sắc thái:</span>
                    <select 
                      value={chap.emotionalTone}
                      onChange={(e) => updateChapter(chap.id, { emotionalTone: e.target.value })}
                      className="bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-200 text-[11px] px-3 py-1 rounded-full font-medium outline-none border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors cursor-pointer"
                    >
                      <option value="U sầu">U sầu</option>
                      <option value="Bình thản">Bình thản</option>
                      <option value="Chữa lành">Chữa lành</option>
                      <option value="Hoài niệm">Hoài niệm</option>
                      <option value="Kịch tính ngầm">Kịch tính ngầm</option>
                      <option value="Căng thẳng">Căng thẳng</option>
                      <option value="Hy vọng">Hy vọng</option>
                    </select>
                  </div>

                  {critiqueResults[chap.id] && (
                    <div className="mt-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 relative">
                      <button 
                        onClick={() => setCritiqueResults(prev => { const next = {...prev}; delete next[chap.id]; return next; })}
                        className="absolute top-4 right-4 text-indigo-300 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-200"
                      >
                        ✕
                      </button>
                      <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                        Góc nhìn Biên tập viên
                      </h4>
                      <div className="text-sm text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed">
                        {critiqueResults[chap.id]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-stone-100 dark:border-stone-800 flex gap-4">
              <button 
                onClick={handleSuggestNext}
                disabled={isSuggestingNext}
                className="flex-1 py-4 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <LightBulbIcon className="w-5 h-5" />
                {isSuggestingNext ? 'Đang suy ngẫm...' : 'Gợi ý chương tiếp theo'}
              </button>
              <button 
                onClick={addChapter}
                className="flex-1 py-4 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-stone-500 dark:text-stone-400 font-bold hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:border-stone-300 dark:hover:border-stone-700 transition-all flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Thêm chương trống
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlineManager;
