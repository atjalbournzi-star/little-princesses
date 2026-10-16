// src/features/products/components/ProductImageUploader.jsx
// مكون رفع ومعاينة صور الفساتين (Drag & Drop / File Upload + Thumbnail Preview)

const { useState, useRef } = React;

function ProductImageUploader({ imageUrl = "", setImageUrl }) {
  const [isDragging, setIsDragging] = useState(false);
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
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className="h-14 p-1.5 bg-slate-900/90 rounded-lg border border-slate-700 flex items-center justify-between gap-2 shadow-xs">
          <div className="h-11 w-11 rounded border border-slate-700/80 bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={imageUrl}
              alt="معاينة الموديل"
              className="h-full w-full object-contain object-center"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-white block truncate">
              تم تحميل صورة الموديل بنجاح ✅
            </span>
            <span className="text-[9.5px] text-slate-400 block truncate">
              جاهزة للعرض الكامل في الكتالوج والتكت
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-6 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition cursor-pointer"
            >
              🔄 تغيير
            </button>
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="h-6 px-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-[10px] font-bold text-rose-300 transition cursor-pointer"
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
          className={`h-14 w-full border border-dashed rounded-lg flex items-center justify-center gap-2 transition cursor-pointer select-none ${
            isDragging
              ? "border-pink-500 bg-pink-950/20 text-white"
              : "border-slate-700 bg-slate-900/50 hover:border-pink-500 text-slate-300"
          }`}
        >
          <span className="text-sm">📸</span>
          <span className="text-xs text-slate-300">
            اسحب صورة الفستان أو <span className="text-pink-400 underline font-bold">تصفح</span>
          </span>
        </div>
      )}
    </div>
  );
}

window.ProductImageUploader = ProductImageUploader;
