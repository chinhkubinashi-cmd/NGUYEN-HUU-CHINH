import React, { useState, useEffect, useRef } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { StoryProject, Chapter, StoryStatus } from '../types';
import { 
  writeChapterContent, 
  continueChapterContent, 
  critiqueWriting, 
  rewriteChapter 
} from '../services/geminiService';
import { 
  SparklesIcon, 
  SaveIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChatBubbleLeftEllipsisIcon, 
  ClipboardIcon, 
  DownloadIcon,
  ShareIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon
} from './Icons';
import { encodeShareCode } from '../services/projectShareService';

interface StoryEditorProps {
  project: StoryProject;
  onUpdate: (updated: StoryProject) => void;
}

const StoryEditor: React.FC<StoryEditorProps> = ({ project, onUpdate }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isWriting, setIsWriting] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showOutlineSummary, setShowOutlineSummary] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentChapter = project.chapters[activeChapterIndex];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [activeChapterIndex, currentChapter?.content]);

  if (project.chapters.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#fdfaf7] dark:bg-[#161412]">
        <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-4">Bản thảo trống</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8">Hãy phác thảo dàn ý trước khi bắt đầu viết những dòng cảm xúc đầu tiên.</p>
      </div>
    );
  }

  const wordCount = currentChapter.content 
    ? currentChapter.content.split(/\s+/).filter(Boolean).length 
    : 0;
  const hasContent = Boolean(currentChapter.content && currentChapter.content.trim().length > 0);

  const handleContentChange = (content: string) => {
    const updatedChapters = [...project.chapters];
    updatedChapters[activeChapterIndex] = { ...currentChapter, content };
    onUpdate({ ...project, chapters: updatedChapters, updatedAt: Date.now() });
  };

  const handleCopyContent = () => {
    if (!currentChapter.content) return;
    navigator.clipboard.writeText(currentChapter.content)
      .then(() => {
        setStatusMessage('Đã sao chép nội dung chương.');
        setTimeout(() => setStatusMessage(''), 3000);
      })
      .catch(err => {
        console.error('Lỗi khi sao chép: ', err);
        setStatusMessage('Lỗi khi sao chép.');
        setTimeout(() => setStatusMessage(''), 3000);
      });
  };

  const handleExportDocx = async () => {
    setStatusMessage('Đang tạo file .docx...');
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: project.title || 'Tác phẩm chưa đặt tên',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 },
              }),
              ...project.chapters.flatMap((chapter, index) => [
                new Paragraph({
                  text: `Chương ${index + 1}: ${chapter.title}`,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 },
                }),
                ...(chapter.content || '').split('\n').map(
                  (line) =>
                    new Paragraph({
                      children: [new TextRun(line)],
                      spacing: { after: 120 },
                    })
                ),
              ]),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${project.title || 'Truyen'}.docx`);
      setStatusMessage('Đã xuất file thành công.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Lỗi khi xuất file: ', error);
      setStatusMessage('Lỗi khi xuất file.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleStopWriting = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsWriting(false);
    setIsContinuing(false);
    setStatusMessage('Đã dừng sáng tác. Mọi câu chữ đã viết đều được giữ nguyên.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  /**
   * Tiếp tục sáng tác từ nội dung dở dang mà không phải viết lại từ đầu
   */
  const handleContinueWriting = async () => {
    if (!hasContent) {
      return generateAIContent(true);
    }

    setIsWriting(true);
    setIsContinuing(true);
    setStatusMessage('Văn sĩ AI đang đọc lại đoạn dở dang và tiếp tục viết...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await continueChapterContent(
        project,
        activeChapterIndex,
        currentChapter.content,
        '',
        (_newChunk, fullCombined) => {
          handleContentChange(fullCombined);
        },
        controller.signal
      );

      if (result) {
        handleContentChange(result);
        setStatusMessage('Đã tiếp nối và hoàn tất sáng tác chương!');
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (error: any) {
      if (controller.signal.aborted) {
        setStatusMessage('Đã tạm dừng sáng tác. Nội dung viết dở đã được lưu.');
      } else {
        console.error('Lỗi khi tiếp tục sáng tác: ', error);
        setStatusMessage('Quá trình bị gián đoạn. Phần nội dung đã viết đã được lưu.');
        alert(
          'Quá trình sáng tác bị ngắt quãng (có thể do kết nối hoặc tài khoản tạm hết quota).\n\n' +
          'Toàn bộ câu chữ viết được tới giờ đã được lưu lại tự động!\n' +
          'Bạn có thể xuất "Mã chia sẻ" để chuyển sang tài khoản khác và bấm "Tiếp tục sáng tác" tại đây để viết tiếp.'
        );
      }
    } finally {
      setIsWriting(false);
      setIsContinuing(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Viết chương mới từ đầu
   */
  const generateAIContent = async (forceOverwrite: boolean = false) => {
    if (hasContent && !forceOverwrite) {
      const confirmed = window.confirm(
        'Chương này hiện đã có nội dung sáng tác!\n\n' +
        '• Bấm OK nếu bạn muốn XÓA BẢN NÀY và VIẾT LẠI MỚI TOÀN BỘ.\n' +
        '• Bấm HỦY (Cancel) nếu bạn muốn dùng nút "Tiếp tục sáng tác" để viết nối tiếp đoạn dở dang.'
      );
      if (!confirmed) return;
    }

    setIsWriting(true);
    setIsContinuing(false);
    setStatusMessage('Văn sĩ AI đang tìm kiếm cảm hứng và chấp bút...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await writeChapterContent(
        project, 
        activeChapterIndex, 
        '',
        (accumulated) => {
          handleContentChange(accumulated);
        },
        controller.signal
      );
      if (result) {
        handleContentChange(result);
        setStatusMessage('Bản thảo đã sẵn sàng để trau chuốt.');
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (error: any) {
      if (controller.signal.aborted) {
        setStatusMessage('Đã dừng sáng tác.');
      } else {
        console.error(error);
        alert('Kết nối bị gián đoạn hoặc tài khoản hết quota. Những nội dung đã viết đã được bảo lưu!');
      }
    } finally {
      setIsWriting(false);
      setIsContinuing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCritique = async () => {
    if (!currentChapter.content) return;
    setIsCritiquing(true);
    try {
      const result = await critiqueWriting(currentChapter.content);
      setCritique(result);
    } catch (error) {
      alert("Biên tập viên đang bận.");
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleApplyCritique = async () => {
    if (!currentChapter.content || !critique) return;
    setIsWriting(true);
    setIsContinuing(false);
    setStatusMessage('Văn sĩ AI đang gọt giũa lại câu chữ dựa trên góp ý...');
    try {
      const revisedContent = await rewriteChapter(project, activeChapterIndex, currentChapter.content, critique);
      handleContentChange(revisedContent);
      setStatusMessage('Đã hoàn tất chỉnh sửa.');
      setCritique(null);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error) {
      console.error(error);
      alert("Không thể thực hiện sửa đổi lúc này.");
    } finally {
      setIsWriting(false);
    }
  };

  const handleManualSave = () => {
    setStatusMessage('Đã lưu bản thảo an toàn.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleToggleStatus = () => {
    const nextStatus: StoryStatus = project.status === 'completed' ? 'in_progress' : 'completed';
    onUpdate({ ...project, status: nextStatus, updatedAt: Date.now() });
    setStatusMessage(nextStatus === 'completed' ? 'Tác phẩm đã đánh dấu: Đã hoàn thành' : 'Tác phẩm đã chuyển sang: Đang sáng tác');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleQuickShare = () => {
    const code = encodeShareCode(project);
    navigator.clipboard.writeText(code)
      .then(() => {
        setStatusMessage('Đã sao chép mã chia sẻ! Dán sang tài khoản mới để tiếp tục sáng tác.');
        setTimeout(() => setStatusMessage(''), 4000);
      })
      .catch(() => {
        setStatusMessage('Không thể tự động sao chép mã.');
        setTimeout(() => setStatusMessage(''), 3000);
      });
  };

  const isCompleted = project.status === 'completed';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfaf7] dark:bg-[#161412] relative overflow-hidden transition-colors duration-200">
      {/* Header bar */}
      <header className="px-6 md:px-10 py-3.5 md:py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap justify-between items-center gap-4 bg-white/70 dark:bg-stone-900/80 backdrop-blur-xl sticky top-0 z-20 transition-colors">
        <div className="flex items-center gap-3 md:gap-5 flex-wrap">
          {/* Chapter pager */}
          <div className="flex items-center gap-1.5 md:gap-2 bg-stone-100/70 dark:bg-stone-800/60 p-1 rounded-xl">
            <button 
              disabled={activeChapterIndex === 0 || isWriting}
              onClick={() => setActiveChapterIndex(prev => prev - 1)}
              className="p-1.5 md:p-2 hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-lg disabled:opacity-20 transition-colors shadow-none hover:shadow-sm"
              title="Chương trước"
            >
              <ChevronLeftIcon className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="text-center px-2 min-w-[120px] md:min-w-[150px]">
              <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest mb-0.5">Chương {activeChapterIndex + 1} / {project.chapters.length}</p>
              <h3 className="font-serif font-bold text-stone-800 dark:text-stone-100 text-base md:text-lg truncate max-w-[180px] md:max-w-[220px]" title={currentChapter.title}>
                {currentChapter.title}
              </h3>
            </div>
            <button 
              disabled={activeChapterIndex === project.chapters.length - 1 || isWriting}
              onClick={() => setActiveChapterIndex(prev => prev + 1)}
              className="p-1.5 md:p-2 hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-lg disabled:opacity-20 transition-colors shadow-none hover:shadow-sm"
              title="Chương kế tiếp"
            >
              <ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Dàn ý toggle button */}
          <button
            onClick={() => setShowOutlineSummary(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showOutlineSummary 
                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750'
            }`}
            title="Xem dàn ý của chương này"
          >
            <span>Dàn ý chương</span>
            <span className="text-[10px] opacity-75">{showOutlineSummary ? '▲' : '▼'}</span>
          </button>

          <div className="hidden sm:block h-6 w-px bg-stone-200 dark:bg-stone-800"></div>

          {/* Story Status Badge / Switcher */}
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-105 shadow-sm ${
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

          {/* Word count & progress indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-stone-700 dark:text-stone-300">{wordCount.toLocaleString()}</span> từ
            {hasContent && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Đã có nội dung"></span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 md:gap-2.5 flex-wrap">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-serif italic animate-pulse hidden lg:inline max-w-xs truncate">
            {statusMessage}
          </span>
          
          <button 
            onClick={handleQuickShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-xs text-stone-700 dark:text-stone-200 shadow-sm group"
            title="Sao chép mã chia sẻ để chuyển sang tài khoản khác khi hết quota"
          >
            <ShareIcon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            <span className="hidden sm:inline">Lấy mã chia sẻ</span>
          </button>

          <button 
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-xs text-stone-600 dark:text-stone-200 shadow-sm group"
            title="Lưu bản thảo"
          >
            <SaveIcon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            <span>Lưu</span>
          </button>

          <button 
            onClick={handleCopyContent}
            disabled={!hasContent}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-xs text-stone-600 dark:text-stone-200 shadow-sm group disabled:opacity-40"
            title="Sao chép toàn bộ nội dung chương"
          >
            <ClipboardIcon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            <span>Sao chép</span>
          </button>

          <button 
            onClick={handleExportDocx}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-xs text-stone-600 dark:text-stone-200 shadow-sm group"
            title="Xuất toàn bộ truyện ra file .docx"
          >
            <DownloadIcon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            <span className="hidden sm:inline">Xuất .docx</span>
          </button>

          <button 
            onClick={handleCritique}
            disabled={isCritiquing || !hasContent || isWriting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-bold text-xs text-stone-600 dark:text-stone-200 shadow-sm disabled:opacity-40"
            title="Góp ý biên tập văn học"
          >
            <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5" />
            <span>Phê bình</span>
          </button>

          {/* Writing Buttons */}
          {hasContent ? (
            <div className="flex items-center gap-1.5">
              {/* Nút Tiếp tục sáng tác */}
              <button 
                onClick={handleContinueWriting}
                disabled={isWriting}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-600 dark:to-amber-800 text-white px-4 md:px-5 py-2 rounded-full hover:from-amber-800 hover:to-amber-950 dark:hover:from-amber-500 dark:hover:to-amber-700 transition-all font-bold text-xs shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
                title="Tiếp tục viết nối tiếp đoạn dở dang theo dàn ý mà không làm mất nội dung cũ"
              >
                <PlayIcon className="w-3.5 h-3.5 text-amber-300 fill-current" />
                <span>{isWriting && isContinuing ? 'Đang viết tiếp...' : 'Tiếp tục sáng tác'}</span>
              </button>

              {/* Nút Viết lại từ đầu */}
              <button 
                onClick={() => generateAIContent(false)}
                disabled={isWriting}
                className="flex items-center gap-1 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-300 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-all font-medium text-xs disabled:opacity-40"
                title="Viết lại toàn bộ chương từ đầu (sẽ có xác nhận trước khi xóa bản cũ)"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Viết lại từ đầu</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => generateAIContent(true)}
              disabled={isWriting}
              className="flex items-center gap-2 bg-amber-900 dark:bg-amber-800 text-white px-4 md:px-5 py-2 rounded-full hover:bg-stone-900 dark:hover:bg-amber-700 transition-all font-bold text-xs shadow-lg disabled:opacity-50 active:scale-95"
              title="Khởi tạo và sáng tác chương từ dàn ý chi tiết"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>{isWriting ? 'Đang viết...' : 'AI Chấp bút'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Accordion Chapter Outline Drawer */}
      {showOutlineSummary && (
        <div className="bg-amber-50/80 dark:bg-stone-850 border-b border-amber-200/60 dark:border-stone-800 px-6 md:px-12 py-4 animate-in slide-in-from-top-2 duration-200 shadow-inner">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Dàn ý chi tiết Chương {activeChapterIndex + 1}: {currentChapter.title}
                </span>
                {currentChapter.emotionalTone && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/70 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200">
                    Sắc thái: {currentChapter.emotionalTone}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                {currentChapter.summary}
              </p>
            </div>
            <button 
              onClick={() => setShowOutlineSummary(false)}
              className="self-start text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-2 py-1 rounded bg-stone-100 dark:bg-stone-800"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* Main writing canvas */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-10 pb-36 px-6 md:px-24">
          <div className="max-w-4xl mx-auto">
            {/* Context reminder banner if story is partially written */}
            {hasContent && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50/70 dark:bg-stone-850/80 border border-amber-200/50 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 font-sans">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>
                    Bản thảo hiện có: <strong className="text-stone-800 dark:text-stone-100">{wordCount} từ</strong>.
                    Nếu đang viết dở mà bị ngắt quãng, bạn có thể bấm <strong>"Tiếp tục sáng tác"</strong> để AI viết nối tiếp tự nhiên.
                  </span>
                </div>
                {!isWriting && (
                  <button
                    onClick={handleContinueWriting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] shadow-sm transition-colors"
                  >
                    <PlayIcon className="w-3 h-3 fill-current" />
                    <span>Viết tiếp ngay</span>
                  </button>
                )}
              </div>
            )}

            <textarea 
              ref={textareaRef}
              value={currentChapter.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full text-xl leading-[2.2] text-stone-700 dark:text-stone-200 bg-transparent resize-none focus:outline-none font-serif placeholder:italic placeholder:text-stone-300 dark:placeholder:text-stone-600"
              placeholder="Bắt đầu gieo những hạt mầm cảm xúc đầu tiên hoặc bấm 'AI Chấp bút' để khởi tạo..."
              style={{ overflow: 'hidden' }}
            />

            {/* Bottom prompt to continue writing if chapter has content */}
            {hasContent && !isWriting && (
              <div className="mt-12 pt-8 border-t border-dashed border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50/60 dark:bg-stone-900/40 p-6 rounded-2xl">
                <div>
                  <h4 className="font-serif font-bold text-stone-800 dark:text-stone-200 text-sm">Chương chưa hoàn thành hoặc muốn viết thêm?</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    AI sẽ bám sát dàn ý và các chi tiết chưa được triển khai để viết tiếp liền mạch từ câu cuối cùng.
                  </p>
                </div>
                <button
                  onClick={handleContinueWriting}
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <SparklesIcon className="w-4 h-4 text-amber-300" />
                  <span>Tiếp tục sáng tác từ đây</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Critique Panel */}
        {critique && (
          <div className="w-96 border-l border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-8 overflow-y-auto animate-in slide-in-from-right duration-500 flex flex-col z-10 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-serif font-bold text-stone-800 dark:text-stone-100 text-lg">Góc nhìn biên tập</h4>
              <button onClick={() => setCritique(null)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xl font-bold">×</button>
            </div>
            <div className="prose prose-sm prose-stone dark:prose-invert italic text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap flex-1 mb-6">
              {critique}
            </div>
            
            <button
                onClick={handleApplyCritique}
                disabled={isWriting}
                className="w-full py-3 bg-amber-800 dark:bg-amber-700 hover:bg-amber-900 dark:hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <SparklesIcon className="w-4 h-4" />
                Áp dụng sửa đổi
            </button>
          </div>
        )}
      </div>

      {/* Writing Progress Banner / Control Overlay */}
      {isWriting && (
        <div className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800 flex flex-col items-center max-w-md w-full text-center animate-in zoom-in-95 duration-200">
            <div className="relative mb-6">
              <div className="w-14 h-14 border-4 border-amber-900/20 dark:border-amber-400/20 border-t-amber-900 dark:border-t-amber-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-amber-800 dark:text-amber-400 text-xs font-bold">
                {isContinuing ? '...' : 'AI'}
              </div>
            </div>

            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-100 mb-2">
              {isContinuing ? 'Đang tiếp tục sáng tác chương...' : 'Đang sáng tác chương mới...'}
            </h3>

            <p className="font-serif italic text-sm text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
              {statusMessage || (isContinuing 
                ? "Văn sĩ AI đang kết nối mạch cảm xúc từ đoạn dở dang, đảm bảo không bỏ sót tình tiết nào trong dàn ý..." 
                : "Văn chương là chuyện tâm hồn, hãy để văn sĩ AI lắng nghe nhịp đập của nhân vật...")}
            </p>

            <div className="w-full bg-stone-100 dark:bg-stone-800/80 rounded-xl p-3 mb-6 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>Đang cập nhật thời gian thực vào bản thảo</span>
              <span className="font-bold text-stone-700 dark:text-stone-200">{wordCount} từ</span>
            </div>

            {/* Dừng lại & Giữ nguyên nội dung */}
            <button
              onClick={handleStopWriting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition-colors shadow-sm"
              title="Dừng lại ngay và lưu lại toàn bộ câu chữ đã viết đến lúc này"
            >
              <StopIcon className="w-3.5 h-3.5 fill-current" />
              <span>Dừng lại & Lưu đoạn này</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryEditor;
