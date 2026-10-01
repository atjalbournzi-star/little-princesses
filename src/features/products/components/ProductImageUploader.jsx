// src/features/products/components/ProductImageUploader.jsx
// مكون رفع ومعاينة صور الفساتين (Drag & Drop / File Upload + Thumbnail Preview)

const { useState, useRef } = React;

function ProductImageUploader({ imageUrl = "", setImageUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#25232A] dark:text-slate-300">
          صورة الموديل / الفستان:
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-[#8F2A87] dark:text-purple-400 hover:underline cursor-pointer"
        >
          {showUrlInput ? "إخفاء رابط الصورة ✕" : "أو إدخال رابط مباشر 🔗"}
        </button>
      </div>

      {showUrlInput && (
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/dress.jpg"
          className="w-full h-9 px-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none focus:border-[#8F2A87]"
        />
      )}

      {/* منطقة السحب والإفلات أو المعاينة المصغرة */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">
          <div className="w-16 h-16 rounded-xl border border-[#E5CEE7] dark:border-purple-800/40 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
            <img
              src={imageUrl}
              alt="معاينة الموديل"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 block">
              ✅ تم تجهيز صورة الفستان
            </span>
            <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block truncate">
              جاهزة للعرض في الكتالوج والتكت
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/40 text-xs font-bold text-[#8F2A87] dark:text-purple-300 transition cursor-pointer"
            >
              🔄 تغيير
            </button>
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 transition cursor-pointer"
            >
              🗑️ حذف
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 border-2 border-dashed rounded-xl transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? "border-[#8F2A87] bg-[#F2E7F3]/50 dark:bg-purple-950/30"
              : "border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900/60 hover:border-[#8F2A87] dark:hover:border-purple-600"
          }`}
        >
          <span className="text-2xl">📸</span>
          <div className="text-xs font-bold text-[#25232A] dark:text-slate-200">
            اسحبي صورة الفستان هنا أو <span className="text-[#8F2A87] dark:text-purple-400 underline">تصفحي جهازك</span>
          </div>
          <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
            يدعم صور JPG, PNG, WEBP (معاينة فورية قبل الحفظ)
          </span>
        </div>
      )}
    </div>
  );
}

window.ProductImageUploader = ProductImageUploader;
