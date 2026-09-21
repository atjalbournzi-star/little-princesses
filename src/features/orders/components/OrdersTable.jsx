// src/features/orders/components/OrdersTable.jsx

function OrdersTable({
  orders = [],
  customers = [],
  currencyDisplay = "YER ريال",
  handleUpdateStatus,
  handleEdit,
  handleDelete,
  onOpenDeliveryModal,
  onOpenCustomerMessage,
  onOpenPrintModal,
  onOpenAlterationModal,
  onViewOrderDetail
}) {
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const statuses = window.ORDER_STATUSES || [];

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E5EA] dark:border-slate-800 shadow-xs">
      {orders.length === 0 ? (
        <div className="text-center py-12 text-[#6F6B75] dark:text-slate-400 text-xs font-medium">
          لا توجد طلبات تطابق البحث 📄
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] dark:bg-slate-900/80 text-[#6F6B75] dark:text-slate-400 font-semibold border-b border-[#E8E5EA] dark:border-slate-800">
              {['رقم الطلب', 'العميل', 'المستفيد / المواصفة', 'الصنف / الموديل', 'الإجمالي', 'المتبقي', 'تاريخ التسليم', 'الحالة', 'الإجراءات'].map(h => (
                <th key={h} className="px-3.5 py-3 text-right whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] dark:divide-slate-800/70 bg-white dark:bg-[#0f172a]">
            {orders.map(o => {
              const cust = (customers || []).find(c => getCustName(c) === o.customer_name);
              const dispChild = (o.child_name && String(o.child_name).trim()) ? o.child_name : (cust?.measurements?.[0]?.child_name || "—");
              const dispDate = o.delivery_date ? String(o.delivery_date).split('T')[0] : (cust?.measurements?.[0]?.event_date ? String(cust.measurements[0].event_date).split('T')[0] : '—');
              const rem = Math.max(0, (parseFloat(o.total ?? o.total_amount) || 0) - (parseFloat(o.paid ?? o.paid_amount) || 0));
              const isPos = o.order_no?.startsWith('POS-') || o.status === 'جاهز للتسليم 🛍️';

              return (
                <tr key={o.id} className="hover:bg-[#FAFAFB] dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-3.5 py-3 font-mono text-[11.5px] text-[#B0005A] dark:text-rose-400 font-bold whitespace-nowrap">
                    {o.order_no || ('ORD-' + o.id)}
                  </td>
                  <td className="px-3.5 py-3 font-bold text-[#25232A] dark:text-slate-100 whitespace-nowrap">
                    {o.customer_name || "—"}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-[#8F2A87] dark:text-purple-300 whitespace-nowrap">
                    {dispChild}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-[#25232A] dark:text-slate-100">
                    <span>{o.product_name}</span> <span className="text-[#6F6B75] dark:text-slate-400 text-[11px] font-mono">×{o.qty ?? o.quantity ?? 1}</span>
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-[#25232A] dark:text-slate-100 whitespace-nowrap">
                    {(parseFloat(o.total ?? o.total_amount) || 0).toLocaleString("en-US")} {currencyDisplay}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    {rem === 0 ? (
                      <span className="text-[#007F8C] dark:text-cyan-300 bg-[#E2F5F7] dark:bg-cyan-950/50 border border-[#C5ECF0] dark:border-cyan-800/50 px-2 py-0.5 rounded-md font-bold text-[10.5px]">مسدد ✅</span>
                    ) : (
                      <span className="text-[#C97300] dark:text-amber-300 bg-[#FFF1DC] dark:bg-amber-950/40 border border-[#FFE4B9] dark:border-amber-800/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10.5px]">{rem.toLocaleString("en-US")} {currencyDisplay}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-[#6F6B75] dark:text-slate-400 whitespace-nowrap">{dispDate}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <select
                      value={o.status || "قيد الخياطة 🪡"}
                      onChange={e => handleUpdateStatus && handleUpdateStatus(o.id, e.target.value)}
                      className="bg-[#FAFAFB] dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 text-[#25232A] dark:text-slate-100 px-2 py-1 rounded-lg font-bold outline-none cursor-pointer text-[11px]"
                    >
                      {statuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                      {o.status && !statuses.includes(o.status) && (
                        <option value={o.status}>{o.status}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 justify-center">
                      {/* تسليم الفستان والتحصيل الخزني */}
                      {(o.status === 'جاهز للتسليم 🛍️' || o.status === 'جاهز للتسليم 📦' || o.status === 'جاهز للتسليم 🎁' || o.status === 'READY' || rem > 0) && onOpenDeliveryModal && (
                        <button
                          onClick={() => onOpenDeliveryModal(o)}
                          title="تسليم الفستان وتحصيل المتبقي وقيد الخزينة 🛍️"
                          className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#B0005A] to-[#8F2A87] hover:opacity-95 text-white flex items-center justify-center cursor-pointer text-xs font-bold shadow-2xs"
                        >
                          🛍️
                        </button>
                      )}

                      {/* رسالة اعتماد الحجز / كرت الفستان الملكي */}
                      {onOpenCustomerMessage && (
                        <button
                          onClick={() => onOpenCustomerMessage(o)}
                          title={isPos ? "عرض وإرسال وثيقة ملكية الفستان الجاهز 🛍️👑" : "عرض وإرسال كرت فستان الأميرة الملكي 👗✨"}
                          className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer text-xs font-bold shadow-2xs ${
                            isPos
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/50 text-[#8F2A87] dark:text-purple-300 border-[#E5CEE7] dark:border-purple-900'
                          }`}
                        >
                          {isPos ? '🛍️' : '👗'}
                        </button>
                      )}

                      {/* طباعة حرارية 80mm */}
                      {onOpenPrintModal && (
                        <button
                          onClick={() => onOpenPrintModal(o, 'thermal')}
                          title="طباعة الفاتورة الحرارية 80mm"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#FCE8F2] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#B0005A] dark:hover:text-rose-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold"
                        >
                          🧾
                        </button>
                      )}

                      {/* أمر تشغيل للورشة */}
                      {onOpenPrintModal && (
                        <button
                          onClick={() => onOpenPrintModal(o, 'job_ticket')}
                          title="طباعة أمر العمل للورشة"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold"
                        >
                          🧵
                        </button>
                      )}

                      {/* ملصق وباركود الصنف */}
                      {onOpenPrintModal && (
                        <button
                          onClick={() => onOpenPrintModal(o, 'hangtag')}
                          title="طباعة ملصق وباركود الصنف"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#E2F5F7] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#007F8C] dark:hover:text-cyan-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold"
                        >
                          🏷️
                        </button>
                      )}

                      {/* تذكرة تعديل بروفة */}
                      {onOpenAlterationModal && (
                        <button
                          onClick={() => onOpenAlterationModal(o)}
                          title="طلب تعديل بروفة ومقاسات ✂️👗"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold"
                        >
                          ✂️
                        </button>
                      )}

                      {/* تفاصيل سريعة */}
                      {onViewOrderDetail && (
                        <button
                          onClick={() => onViewOrderDetail(o)}
                          title="عرض تفاصيل الطلب"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#007F8C] dark:hover:text-cyan-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs"
                        >
                          👁️
                        </button>
                      )}

                      {/* تعديل */}
                      <button
                        onClick={() => handleEdit && handleEdit(o)}
                        title="تعديل"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#25232A] dark:hover:text-slate-100 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs"
                      >
                        ✏️
                      </button>

                      {/* حذف */}
                      <button
                        onClick={() => handleDelete && handleDelete(o.id)}
                        title="حذف"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#6F6B75] dark:text-slate-300 hover:text-[#D64545] dark:hover:text-rose-400 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

window.OrdersTable = OrdersTable;
