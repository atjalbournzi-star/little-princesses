// src/features/expenses/components/ExpenseReceiptUpload.jsx
// المكون التفاعلي لرفع ومعاينة إيصالات وفواتير المصاريف التشغيلية
const { useRef, useState } = React;

function ExpenseReceiptUpload({
  attachmentUrl = "",
  attachmentName = "",
  onAttachmentChange,
  onClear
}) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(attachmentName || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت) ⚠️");
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        let storagePath = `receipts_vault/rec_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        // محاولة الرفع المباشر إلى مستودع Supabase Storage إذا كان مهيأ
        if (window.supabase && window.supabase.storage) {
          try {
            const { data, error } = await window.supabase.storage
              .from("receipts_vault")
              .upload(storagePath, file, { cacheControl: "3600", upsert: true });

            if (!error && data?.path) {
              storagePath = data.path;
            }
          } catch (uploadErr) {
            console.warn("Supabase upload fallback to local dataUrl:", uploadErr);
          }
        }

        if (onAttachmentChange) {
          onAttachmentChange(dataUrl, file.name, storagePath);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing receipt file:", err);
      setIsUploading(false);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClear) onClear();
  };

  const hasAttachment = Boolean(attachmentUrl || fileName);

  return (
    <div className="relative inline-flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!hasAttachment ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-8 px-3 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer transition select-none"
          title="إرفاق صورة فاتورة أو سند الصرف"
        >
          <span>📎</span>
          <span>{isUploading ? "جاري الرفع..." : "إرفاق إيصال"}</span>
        </button>
      ) : (
        <div className="h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-2 select-none shadow-xs">
          {attachmentUrl && !attachmentUrl.includes("application/pdf") ? (
            <img
              src={attachmentUrl}
              alt="Thumbnail"
              className="w-6 h-6 object-cover rounded bg-slate-800 shrink-0 border border-slate-700"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-slate-800 shrink-0 flex items-center justify-center text-xs text-amber-400 border border-slate-700">
              📄
            </div>
          )}

          <span
            className="text-[10px] text-slate-300 max-w-[120px] truncate font-mono"
            title={fileName || "إيصال مرفق"}
          >
            {fileName || "receipt_attached"}
          </span>

          <button
            type="button"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 p-0.5 rounded text-xs font-bold transition cursor-pointer"
            title="إزالة الإيصال المرفق"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

window.ExpenseReceiptUpload = ExpenseReceiptUpload;