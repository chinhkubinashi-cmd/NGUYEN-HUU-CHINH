
import React, { useRef } from 'react';
import { TrashIcon, DownloadIcon, UploadIcon, SunIcon, MoonIcon } from './Icons';
import { StoryProject } from '../types';

interface SettingsProps {
  projects: StoryProject[];
  onReset: () => void;
  onImport: (projects: StoryProject[]) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ projects, onReset, onImport, isDarkMode, onToggleDarkMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "van_si_projects.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          onImport(importedData);
          alert(`Nhập thành công ${importedData.length} tác phẩm vào thư viện!`);
        } else if (importedData && typeof importedData === 'object' && importedData.title) {
          const merged = [importedData, ...projects.filter(p => p.id !== importedData.id)];
          onImport(merged);
          alert(`Nhập tác phẩm "${importedData.title}" thành công!`);
        } else {
          alert('Định dạng file không hợp lệ.');
        }
      } catch (error) {
        alert('Lỗi khi đọc file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="p-10 max-w-4xl mx-auto w-full h-full overflow-y-auto">
      <header className="mb-12">
        <h2 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-2">Cài đặt</h2>
        <p className="text-stone-500 dark:text-stone-400">Quản lý dữ liệu và tùy chọn ứng dụng.</p>
      </header>

      {/* Theme Settings Section */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden mb-8 transition-colors">
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850">
          <h3 className="font-bold text-stone-700 dark:text-stone-200">Giao diện</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">Tùy chỉnh chế độ hiển thị sáng/tối phù hợp với mắt bạn.</p>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-800 dark:text-stone-100 mb-1">Chế độ giao diện (Ngày / Đêm)</h4>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Hiện đang sử dụng: <strong className="text-amber-800 dark:text-amber-400">{isDarkMode ? 'Chế độ Ban đêm (Dark mode)' : 'Chế độ Ban ngày (Light mode)'}</strong>
              </p>
            </div>
            <button 
              onClick={onToggleDarkMode}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl border transition-all font-bold text-sm ${
                isDarkMode 
                  ? 'bg-stone-800 border-amber-600/50 text-amber-300 hover:bg-stone-700 shadow-md' 
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-sm'
              }`}
            >
              {isDarkMode ? <SunIcon className="w-5 h-5 text-amber-400" /> : <MoonIcon className="w-5 h-5 text-amber-700" />}
              <span>{isDarkMode ? 'Bật Chế độ Ban ngày' : 'Bật Chế độ Ban đêm'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden mb-8 transition-colors">
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850">
          <h3 className="font-bold text-stone-700 dark:text-stone-200">Dữ liệu</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">Xuất hoặc nhập dữ liệu truyện của bạn.</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-800 dark:text-stone-100 mb-1">Xuất dữ liệu</h4>
              <p className="text-sm text-stone-500 dark:text-stone-400">Lưu tất cả tác phẩm của bạn ra file JSON.</p>
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-6 py-3 rounded-xl border border-amber-100 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors font-bold text-sm"
            >
              <DownloadIcon className="w-5 h-5" />
              Xuất dữ liệu
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-800 dark:text-stone-100 mb-1">Nhập dữ liệu</h4>
              <p className="text-sm text-stone-500 dark:text-stone-400">Tải lên file JSON để khôi phục dữ liệu.</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-6 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors font-bold text-sm"
            >
              <UploadIcon className="w-5 h-5" />
              Nhập dữ liệu
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850">
          <h3 className="font-bold text-stone-700 dark:text-stone-200">Vùng nguy hiểm</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">Các hành động dưới đây không thể hoàn tác.</p>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-800 dark:text-stone-100 mb-1">Xóa toàn bộ dữ liệu</h4>
              <p className="text-sm text-stone-500 dark:text-stone-400">Xóa tất cả các tác phẩm, nhân vật và thiết lập khỏi trình duyệt này.</p>
            </div>
            <button 
              onClick={onReset}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-6 py-3 rounded-xl border border-red-100 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
            >
              <TrashIcon className="w-5 h-5" />
              Reset Dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
