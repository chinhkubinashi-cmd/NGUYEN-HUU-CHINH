import React, { useState, useMemo, useRef } from 'react';
import { StoryProject, StoryStatus } from '../types';
import { 
  PlusIcon, 
  TrashIcon, 
  ShareIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UploadIcon, 
  DownloadIcon, 
  ClipboardIcon 
} from './Icons';
import { generateStoryIdea } from '../services/geminiService';
import { 
  encodeShareCode, 
  decodeShareCode, 
  exportSingleProject, 
  checkIsAllChaptersWritten 
} from '../services/projectShareService';

interface DashboardProps {
  projects: StoryProject[];
  onCreate: (title: string, premise: string, autoGenerateOutline?: boolean) => void;
  onSelectProject: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus?: StoryStatus) => void;
  onImportProject: (project: StoryProject) => void;
}

interface StoryIdea {
  title: string;
  premise: string;
  message: string;
}

type FilterType = 'all' | 'in_progress' | 'completed';

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  onCreate, 
  onSelectProject, 
  onDelete,
  onToggleStatus,
  onImportProject
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<StoryProject | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Create story state
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<StoryIdea[] | null>(null);

  // Filter and search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Share modal state
  const [copiedShareCode, setCopiedShareCode] = useState(false);

  // Import modal state
  const [importTab, setImportTab] = useState<'code' | 'file'>('code');
  const [pastedCode, setPastedCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<StoryProject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Counts
  const inProgressCount = useMemo(() => {
    return projects.filter(p => p.status !== 'completed').length;
  }, [projects]);

  const completedCount = useMemo(() => {
    return projects.filter(p => p.status === 'completed').length;
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const isCompleted = p.status === 'completed';
      if (filterType === 'in_progress' && isCompleted) return false;
      if (filterType === 'completed' && !isCompleted) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchPremise = p.premise.toLowerCase().includes(query);
        if (!matchTitle && !matchPremise) return false;
      }

      return true;
    });
  }, [projects, filterType, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !premise) return;
    onCreate(title, premise);
    setShowCreateModal(false);
    setTitle('');
    setPremise('');
    setAiSuggestions(null);
  };

  const handleAiBrainstorm = async () => {
    if (!premise) return;
    setIsGenerating(true);
    try {
      const suggestionsRaw = await generateStoryIdea(premise);
      const jsonStr = suggestionsRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedSuggestions = JSON.parse(jsonStr);
      setAiSuggestions(parsedSuggestions);
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối với trí tuệ nhân tạo hoặc lỗi định dạng.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectIdea = (idea: StoryIdea) => {
    setTitle(idea.title);
    setPremise(idea.premise);
    onCreate(idea.title, idea.premise, true);
    setShowCreateModal(false);
    setTitle('');
    setPremise('');
    setAiSuggestions(null);
  };

  // Share handlers
  const handleOpenShare = (project: StoryProject, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowShareModal(project);
    setCopiedShareCode(false);
  };

  const handleCopyShareCode = () => {
    if (!showShareModal) return;
    const code = encodeShareCode(showShareModal);
    navigator.clipboard.writeText(code).then(() => {
      setCopiedShareCode(true);
      setTimeout(() => setCopiedShareCode(false), 3000);
    }).catch(err => {
      console.error("Clipboard error:", err);
      alert("Không thể sao chép mã tự động. Vui lòng chọn và sao chép thủ công.");
    });
  };

  // Import code preview & apply
  const handlePastedCodeChange = (text: string) => {
    setPastedCode(text);
    setImportError(null);
    setImportSuccess(null);
    if (!text.trim()) {
      setPreviewProject(null);
      return;
    }

    try {
      const decoded = decodeShareCode(text);
      setPreviewProject(decoded);
    } catch {
      setPreviewProject(null);
    }
  };

  const handleConfirmImport = (asCopy: boolean = false) => {
    try {
      const projectToImport = previewProject || decodeShareCode(pastedCode);
      const finalProject: StoryProject = {
        ...projectToImport,
        id: asCopy ? Date.now().toString() : projectToImport.id,
        title: asCopy ? `${projectToImport.title} (Bản sao)` : projectToImport.title,
        updatedAt: Date.now()
      };

      onImportProject(finalProject);
      setImportSuccess(`Đã nhập truyện "${finalProject.title}" thành công vào thư viện!`);
      setTimeout(() => {
        setShowImportModal(false);
        setPastedCode('');
        setPreviewProject(null);
        setImportSuccess(null);
        setImportError(null);
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || 'Mã chia sẻ không hợp lệ.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
          // Multiple projects
          let count = 0;
          parsed.forEach((proj: StoryProject) => {
            if (proj && proj.title) {
              onImportProject(proj);
              count++;
            }
          });
          setImportSuccess(`Đã nhập thành công ${count} tác phẩm từ file sao lưu!`);
        } else if (parsed && typeof parsed === 'object' && parsed.title) {
          // Single project
          const normalized: StoryProject = {
            id: parsed.id || Date.now().toString(),
            title: parsed.title,
            premise: parsed.premise || '',
            setting: parsed.setting || 'Việt Nam hiện đại',
            characters: Array.isArray(parsed.characters) ? parsed.characters : [],
            outline: Array.isArray(parsed.outline) ? parsed.outline : [],
            chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
            createdAt: parsed.createdAt || Date.now(),
            status: parsed.status === 'completed' ? 'completed' : 'in_progress',
            updatedAt: Date.now()
          };
          onImportProject(normalized);
          setImportSuccess(`Đã nhập thành công truyện "${normalized.title}"!`);
        } else {
          setImportError('Cấu trúc file JSON không hợp lệ.');
        }

        setTimeout(() => {
          setShowImportModal(false);
          setImportSuccess(null);
        }, 1200);
      } catch (err) {
        setImportError('Không thể đọc file JSON này. Vui lòng kiểm tra lại file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-8 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-2">
            Thư viện Tác phẩm
          </h2>
          <p className="text-stone-500 dark:text-stone-400 italic">
            "Viết là một cách để lắng nghe những tiếng vang nhỏ nhất của tâm hồn."
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setShowImportModal(true);
              setImportError(null);
              setImportSuccess(null);
              setPastedCode('');
              setPreviewProject(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-amber-500 dark:hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-bold text-sm shadow-sm transition-all"
            title="Nhập truyện từ tài khoản khác khi hết quota"
          >
            <UploadIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Nhập truyện / Dán mã</span>
          </button>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-md"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Tạo dự án mới</span>
          </button>
        </div>
      </header>

      {/* Filter Tabs and Search Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              filterType === 'all'
                ? 'bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span>Tất cả</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-black/20">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('in_progress')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              filterType === 'in_progress'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Đang sáng tác</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-black/20">
              {inProgressCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              filterType === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800'
            }`}
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>Đã hoàn thành</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-black/20">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên truyện hoặc cốt truyện..."
            className="w-full text-xs px-4 py-2.5 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <section className="mb-12">
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl p-16 text-center">
            <p className="text-stone-400 dark:text-stone-500 mb-4 text-base">
              {projects.length === 0 
                ? "Bạn chưa có tác phẩm nào trong thư viện. Hãy bắt đầu kể một câu chuyện ngay!" 
                : "Không tìm thấy tác phẩm nào phù hợp với bộ lọc hiện tại."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-amber-800 dark:bg-amber-700 text-white px-6 py-2.5 rounded-xl hover:bg-amber-900 dark:hover:bg-amber-600 transition-colors shadow-md text-sm font-bold"
              >
                Tạo dự án mới
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 px-6 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm font-bold"
              >
                Nhập từ tài khoản khác
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(p => {
              const isCompleted = p.status === 'completed';
              const allWritten = checkIsAllChaptersWritten(p);
              const totalWords = p.chapters.reduce((sum, ch) => {
                return sum + (ch.content ? ch.content.split(/\s+/).filter(Boolean).length : 0);
              }, 0);

              return (
                <div 
                  key={p.id} 
                  className="group bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 hover:shadow-xl dark:hover:border-stone-700 transition-all cursor-pointer flex flex-col justify-between relative"
                  onClick={() => onSelectProject(p.id)}
                >
                  <div>
                    {/* Top Status & Controls */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Clickable Status Tag */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(p.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 ${
                          isCompleted 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                        title="Bấm để chuyển đổi giữa Đang sáng tác và Đã hoàn thành"
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            <span>Đã hoàn thành</span>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>Đang sáng tác</span>
                          </>
                        )}
                      </button>

                      {/* Top Action Icons */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => handleOpenShare(p, e)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Chia sẻ truyện / Lấy mã chuyển sang tài khoản khác khi hết quota"
                        >
                          <ShareIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSingleProject(p);
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Tải file dự án .json"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onDelete(p.id); 
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Xóa tác phẩm"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Story Title & Premise */}
                    <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2 font-serif group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                      {p.title}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 mb-4 leading-relaxed">
                      {p.premise}
                    </p>
                  </div>

                  <div>
                    {/* Completion suggestion helper if fully written */}
                    {!isCompleted && allWritten && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(p.id, 'completed');
                        }}
                        className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="Bấm để đánh dấu hoàn thành tác phẩm"
                      >
                        <span className="font-medium">✨ Đã viết xong tất cả chương</span>
                        <span className="font-bold underline ml-1">Đánh dấu xong</span>
                      </div>
                    )}

                    {/* Story Meta footer */}
                    <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex justify-between items-center text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">
                      <span>{p.chapters.length} chương {totalWords > 0 ? `• ~${totalWords.toLocaleString()} chữ` : ''}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1: Create Story */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfaf7] dark:bg-stone-900 border dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 overflow-y-auto">
              <h3 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-6">Khởi tạo tác phẩm</h3>
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-600 dark:text-stone-300 uppercase mb-2">Tiêu đề truyện</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-all"
                    placeholder="Nhập tên câu chuyện..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-600 dark:text-stone-300 uppercase mb-2">Cốt truyện sơ bộ (Premise)</label>
                  <textarea 
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    className="w-full bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 h-32 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-all resize-none"
                    placeholder="Mô tả ngắn gọn về câu chuyện hoặc ý tưởng của bạn..."
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={handleAiBrainstorm}
                    disabled={isGenerating || !premise}
                    className="flex-1 border-2 border-amber-800 dark:border-amber-600 text-amber-800 dark:text-amber-400 py-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50 transition-colors font-bold"
                  >
                    {isGenerating ? 'Đang suy nghĩ...' : '🤖 Nhờ AI gợi ý ý tưởng'}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-amber-800 dark:bg-amber-700 text-white py-3 rounded-xl hover:bg-amber-900 dark:hover:bg-amber-600 transition-colors font-bold shadow-lg"
                  >
                    Bắt đầu viết
                  </button>
                </div>
              </form>

              {aiSuggestions && (
                <div className="mt-8 space-y-4">
                  <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-3 text-sm uppercase tracking-wider">💡 Gợi ý từ Gemini:</h4>
                  <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
                    {aiSuggestions.map((idea, idx) => (
                      <div key={idx} className="p-5 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-2xl hover:border-amber-300 dark:hover:border-amber-600 transition-colors">
                        <h5 className="font-serif font-bold text-lg text-amber-900 dark:text-amber-300 mb-2">{idea.title}</h5>
                        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3 leading-relaxed">{idea.premise}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 italic mb-4">Thông điệp: {idea.message}</p>
                        <button 
                          onClick={() => handleSelectIdea(idea)}
                          className="w-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 py-2 rounded-xl text-sm font-bold hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                        >
                          Chọn kịch bản này & Tạo dàn ý
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border-t dark:border-stone-800 text-right">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-medium text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Share / Transfer Story */}
      {showShareModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfaf7] dark:bg-stone-900 border dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    Chuyển giao & Tiếp tục sáng tác
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 mt-1">
                    Chia sẻ "{showShareModal.title}"
                  </h3>
                </div>
                <button 
                  onClick={() => setShowShareModal(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Instructions banner */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 mb-6 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                <strong className="text-amber-900 dark:text-amber-300 block mb-1">
                  💡 Bạn muốn đổi tài khoản Google khi hết Quota?
                </strong>
                Chỉ cần sao chép <strong>Mã chia sẻ</strong> bên dưới hoặc tải <strong>File dự án .json</strong>. Sau đó, đăng nhập tài khoản Google mới, mở ứng dụng và bấm <strong>"Nhập truyện"</strong> là có thể tiếp tục viết tiếp mà không bị mất dữ liệu hay tiến trình dang dở!
              </div>

              {/* Summary of what will be shared */}
              <div className="bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-bold">Trạng thái</span>
                  <strong className={showShareModal.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}>
                    {showShareModal.status === 'completed' ? 'Đã hoàn thành' : 'Đang sáng tác'}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-bold">Số chương</span>
                  <strong className="text-stone-800 dark:text-stone-200">{showShareModal.chapters.length} chương</strong>
                </div>
                <div>
                  <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-bold">Số nhân vật</span>
                  <strong className="text-stone-800 dark:text-stone-200">{showShareModal.characters.length} nhân vật</strong>
                </div>
              </div>

              {/* Share Code Field */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Mã chia sẻ nhanh (Share Code)
                  </label>
                  <span className="text-[11px] text-stone-400 italic">Mã đã mã hóa UTF-8 an toàn</span>
                </div>
                <textarea 
                  readOnly
                  rows={4}
                  value={encodeShareCode(showShareModal)}
                  className="w-full bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 rounded-xl p-3 text-xs font-mono select-all focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={handleCopyShareCode}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md ${
                    copiedShareCode 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white'
                  }`}
                >
                  <ClipboardIcon className="w-4 h-4" />
                  <span>{copiedShareCode ? '✓ Đã sao chép mã vào Clipboard' : 'Sao chép mã chia sẻ'}</span>
                </button>

                <button 
                  onClick={() => exportSingleProject(showShareModal)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all shadow-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Tải file dự án (.json)</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border-t dark:border-stone-800 text-right">
              <button 
                onClick={() => setShowShareModal(null)}
                className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Import Story from other account / file */}
      {showImportModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfaf7] dark:bg-stone-900 border dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    Khôi phục & Tiếp tục viết
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 mt-1">
                    Nhập tác phẩm vào thư viện
                  </h3>
                </div>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Tabs: Code vs File */}
              <div className="flex border-b border-stone-200 dark:border-stone-800 mb-6">
                <button 
                  onClick={() => setImportTab('code')}
                  className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${
                    importTab === 'code'
                      ? 'border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Dán Mã chia sẻ (Share Code)
                </button>
                <button 
                  onClick={() => setImportTab('file')}
                  className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${
                    importTab === 'file'
                      ? 'border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Tải lên File (.json)
                </button>
              </div>

              {importError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {importSuccess}
                </div>
              )}

              {/* Tab 1: Paste Code */}
              {importTab === 'code' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 uppercase mb-2">
                      Dán Mã chia sẻ hoặc JSON truyện tại đây:
                    </label>
                    <textarea 
                      rows={5}
                      value={pastedCode}
                      onChange={(e) => handlePastedCodeChange(e.target.value)}
                      placeholder="Dán mã bắt đầu bằng VANSI:v1:... hoặc chuỗi JSON của tác phẩm..."
                      className="w-full bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Live preview of detected project */}
                  {previewProject && (
                    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-950 dark:text-amber-200 font-serif text-base">
                          {previewProject.title}
                        </strong>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          previewProject.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        }`}>
                          {previewProject.status === 'completed' ? 'Đã hoàn thành' : 'Đang sáng tác'}
                        </span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 line-clamp-2">
                        {previewProject.premise}
                      </p>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex gap-4 pt-1">
                        <span>{previewProject.chapters.length} chương</span>
                        <span>{previewProject.characters.length} nhân vật</span>
                        <span>{previewProject.outline.length} mục dàn ý</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => handleConfirmImport(false)}
                      disabled={!pastedCode.trim()}
                      className="flex-1 bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-md disabled:opacity-40 transition-colors"
                    >
                      Nhập tác phẩm vào thư viện
                    </button>
                    {projects.some(p => previewProject && p.id === previewProject.id) && (
                      <button 
                        onClick={() => handleConfirmImport(true)}
                        disabled={!pastedCode.trim()}
                        className="border border-amber-800 dark:border-amber-600 text-amber-800 dark:text-amber-300 py-3 px-4 rounded-xl font-bold text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Nhập dưới dạng một bản sao mới thay vì ghi đè"
                      >
                        Lưu thành bản sao mới
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Upload File */}
              {importTab === 'file' && (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-600 dark:hover:border-amber-500 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-white dark:bg-stone-850"
                  >
                    <UploadIcon className="w-10 h-10 text-amber-700 dark:text-amber-400 mx-auto mb-3" />
                    <p className="text-stone-800 dark:text-stone-200 font-bold text-sm mb-1">
                      Bấm để chọn file dự án (.json)
                    </p>
                    <p className="text-stone-400 text-xs">
                      Hỗ trợ cả file truyện đơn lẻ (.vansi_du_an.json) lẫn file sao lưu toàn bộ thư viện
                    </p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".json" 
                    className="hidden" 
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border-t dark:border-stone-800 text-right">
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
