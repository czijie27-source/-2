import React, { useState } from "react";
import { DefectItem, DefectSeverity, DefectType } from "../types";
import { Search, Plus, Filter, FileSpreadsheet, ShieldCheck, Wrench, CheckCircle, Check, Trash2, ArrowUpDown } from "lucide-react";

interface ReportArchiveProps {
  defects: DefectItem[];
  onAddDefect: (d: DefectItem) => void;
  onUpdateDefect: (d: DefectItem) => void;
  onDeleteDefect: (id: string) => void;
}

export default function ReportArchive({
  defects,
  onAddDefect,
  onUpdateDefect,
  onDeleteDefect,
}: ReportArchiveProps) {
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Form manual insert state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<DefectType>(DefectType.CRACK);
  const [formSeverity, setFormSeverity] = useState<DefectSeverity>(DefectSeverity.LEVEL_II);
  const [formX, setFormX] = useState("15.5");
  const [formY, setFormY] = useState("120.0");
  const [formZ, setFormZ] = useState("5.0");
  const [formLength, setFormLength] = useState("250");
  const [formWidth, setFormWidth] = useState("8");
  const [formDepth, setFormDepth] = useState("3");
  const [formPautThickness, setFormPautThickness] = useState("22");
  const [formSummary, setFormSummary] = useState("");

  // Handle manual submit
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const isDeep = formType === DefectType.VOID || formType === DefectType.DELAMINATION || formType === DefectType.DEEP_CRACK;
    const newDefect: DefectItem = {
      id: "DEF-" + (defects.length + 1).toString().padStart(2, "0"),
      type: formType,
      severity: formSeverity,
      x: FloatOr(formX, 10),
      y: FloatOr(formY, 110),
      z: FloatOr(formZ, 5),
      length: FloatOr(formLength, 150),
      width: FloatOr(formWidth, 5),
      depth: isDeep ? FloatOr(formDepth, 2) : 0,
      pautConfidence: 90.0,
      timestamp: new Date().toLocaleString("zh-CN").replace(/\//g, "-"),
      pautThickness: FloatOr(formPautThickness, 25),
      isSubsurface: isDeep,
      summary: formSummary || "现场人员或无人巡检爬筒机器人拍摄、超声采集回传之宏观损伤缺陷形态。",
      suggestedAction: isDeep 
        ? "指派特种灌浆小组对该内部空洞处注入高性能微膨胀加固物，修复承载力。" 
        : "打磨表面锈蚀，重铺底座两底两面氟碳防护防腐特重防锈漆层。"
    };

    onAddDefect(newDefect);
    setShowAddForm(false);
    setFormSummary("");
  };

  const FloatOr = (val: string, fallback: number) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Dispatch fix squad action
  const handleDispatchSquad = (d: DefectItem) => {
    const updated: DefectItem = {
      ...d,
      summary: `${d.summary} [已于 ${new Date().toLocaleDateString("zh-CN")} 委派特种修补一队开展注胶维保]`,
    };
    onUpdateDefect(updated);
  };

  const handleMarkResolved = (d: DefectItem) => {
    const updated: DefectItem = {
      ...d,
      pautConfidence: 100.0, // indicating completed diagnostic verification post-fix
      summary: `${d.summary} [已修复，并经PAUT重检合格，厚度恢复正常承载指标]`,
    };
    onUpdateDefect(updated);
  };

  // Filter list
  const filteredList = defects.filter(d => {
    const matchSearch = d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchSeverity = severityFilter === "ALL" || d.severity === severityFilter;
    const matchType = typeFilter === "ALL" || 
      (typeFilter === "VISUAL" && !d.isSubsurface) ||
      (typeFilter === "ULTRASOUND" && d.isSubsurface);

    return matchSearch && matchSeverity && matchType;
  });

  const getSeverityBadgeClass = (sev: DefectSeverity) => {
    switch (sev) {
      case DefectSeverity.LEVEL_I:
        return "bg-blue-50 text-blue-600 border-blue-200";
      case DefectSeverity.LEVEL_II:
        return "bg-yellow-50 text-yellow-600 border-yellow-250";
      case DefectSeverity.LEVEL_III:
        return "bg-orange-50 text-orange-600 border-orange-200";
      case DefectSeverity.LEVEL_IV:
        return "bg-red-50 text-red-600 border-red-200";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="report-database-view">
      {/* Search filters and Ledger Section (Glass card) */}
      <div className={`glass-panel p-5 ${showAddForm ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col space-y-4`} id="ledger-main">
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 gap-3">
          <div>
            <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-brand-primary" /> 全生命周期运维病害总账
            </span>
            <p className="text-xxs text-zinc-500 font-sans mt-0.5 font-medium">多模态声学探伤无损层析与表面影像智能解算融合总账数据库</p>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="flex items-center gap-1.5 p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 rounded-lg font-bold cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" /> 新增录入病害隐患
            </button>
          </div>
        </div>

        {/* Filter Toolbar with beautiful light inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-150" id="filter-toolbar">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
            <input
              type="text"
              placeholder="搜索编号、词表类型、细节..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white hover:bg-zinc-100/20 border border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-700 focus:bg-white focus:border-brand-primary outline-none transition-all"
            />
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="flex-grow bg-white border border-zinc-200 rounded-lg p-1.5 text-xs text-zinc-700 focus:border-brand-primary outline-none cursor-pointer transition-all font-semibold"
            >
              <option value="ALL">全部级别 (I-IV)</option>
              <option value={DefectSeverity.LEVEL_I}>I 级 (轻微隐患)</option>
              <option value={DefectSeverity.LEVEL_II}>II 级 (中等破损)</option>
              <option value={DefectSeverity.LEVEL_III}>III 级 (严重失效)</option>
              <option value={DefectSeverity.LEVEL_IV}>IV 级 (高危断裂)</option>
            </select>
          </div>

          {/* Modal Type selection */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-grow bg-white border border-zinc-200 rounded-lg p-1.5 text-xs text-zinc-700 focus:border-brand-primary outline-none cursor-pointer transition-all font-semibold"
            >
              <option value="ALL">全部数据源</option>
              <option value="VISUAL">表观相机 (视觉成像)</option>
              <option value="ULTRASOUND">无损相控阵 (超声A-Scan)</option>
            </select>
          </div>

          <div className="text-right text-[10px] font-mono text-zinc-550 flex items-center justify-end font-bold pr-1">
            总查得: <span className="text-brand-primary font-bold ml-1">{filteredList.length} 条符合</span>
          </div>
        </div>

        {/* Big Table ledger  */}
        <div className="overflow-x-auto border border-zinc-150 rounded-lg shadow-inner">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-xs font-sans">
            <thead className="bg-[#fbfcff] font-display text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-150 font-black">
              <tr>
                <th className="px-4 py-3">漏洞编号</th>
                <th className="px-4 py-3">评估大类</th>
                <th className="px-4 py-3">裂隙分级</th>
                <th className="px-4 py-3">UWB 精密定轨</th>
                <th className="px-4 py-3">余厚测值</th>
                <th className="px-4 py-3">缺陷言辞摘要</th>
                <th className="px-4 py-3 text-right">协同处置动作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 bg-white text-zinc-700 text-xxs font-mono">
              {filteredList.map((d) => {
                const isRepaired = d.pautConfidence >= 100.0;
                return (
                  <tr key={d.id} className="hover:bg-zinc-50/75 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-900 text-xs">{d.id}</td>
                    <td className="px-4 py-3 font-sans">
                      <span className="font-bold text-xs text-zinc-850">
                        {d.type}
                      </span>
                      <span className="block text-[9px] text-zinc-400 font-bold mt-0.5 uppercase tracking-wide">
                        {d.isSubsurface ? "PAUT 声波深层" : "视觉 4K 影像"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span className={`border px-2 py-0.5 rounded-full text-[9px] font-bold leading-none ${getSeverityBadgeClass(d.severity)}`}>
                        {d.severity.replace("LEVEL_", "")}级
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-bold">
                      <div>X: {d.x}mm</div>
                      <div>Y: {d.y}m</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-650">
                      <div className="font-bold text-zinc-850">{d.pautThickness} mm</div>
                      <div className="text-zinc-400 font-medium">分层: {d.depth}mm</div>
                    </td>
                    <td className="px-4 py-3 font-sans text-zinc-500 max-w-xs leading-relaxed text-[10px] font-medium">
                      {d.summary}
                    </td>
                    <td className="px-4 py-3 text-right font-sans space-y-1">
                      {isRepaired ? (
                        <div className="text-emerald-600 font-bold text-xxs flex items-center justify-end gap-1 select-none">
                          <CheckCircle className="w-3.5 h-3.5" /> 已灌浆修补闭环
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-1.5 justify-end">
                          <button
                            onClick={() => handleDispatchSquad(d)}
                            className="p-1 px-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:text-brand-primary rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <Wrench className="w-3 h-3 text-brand-primary" /> 下发修补单
                          </button>
                          <button
                            onClick={() => handleMarkResolved(d)}
                            className="p-1 px-2 border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <Check className="w-3 h-3 text-emerald-500" /> 手动销账
                          </button>
                        </div>
                      )}
                      {!isRepaired && (
                        <button
                          onClick={() => onDeleteDefect(d.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded text-[9px] font-bold inline-block cursor-pointer"
                          title="物理剔除该条数据漏报测"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> 剔除误报
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-400 font-sans italic text-xs">
                    未查找到符合过滤筛选条件的巡检隐患记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Inspection Entry Sidebar (if visible) */}
      {showAddForm && (
        <div className="lg:col-span-4 glass-panel p-5 flex flex-col justify-between space-y-4" id="manual-form">
          <form onSubmit={handleSubmitManual} className="space-y-4">
            <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
              <span className="font-display font-bold text-zinc-900 tracking-tight text-xs flex items-center gap-1.5 uppercase">
                <Plus className="w-4 h-4 text-brand-primary" /> 巡检病害手工上报
              </span>
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xxs text-zinc-400 hover:text-zinc-650 font-bold"
              >
                关闭面板
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">多模态缺陷种类:</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as DefectType)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 outline-none focus:bg-white focus:border-brand-primary cursor-pointer transition-all"
                >
                  <option value={DefectType.CRACK}>表面裂纹</option>
                  <option value={DefectType.PAINT_PEEL}>漆面脱落</option>
                  <option value={DefectType.DAMAGE}>物理撞击结构破损</option>
                  <option value={DefectType.OIL_STAIN}>轴承渗油点迹</option>
                  <option value={DefectType.VOID}>内部空洞 (超声PAUT)</option>
                  <option value={DefectType.DELAMINATION}>层间脱粘 (超声PAUT)</option>
                  <option value={DefectType.DEEP_CRACK}>深层疲劳内裂纹 (超声PAUT)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">评估严重级别:</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as DefectSeverity)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 outline-none focus:bg-white focus:border-brand-primary cursor-pointer transition-all"
                >
                  <option value={DefectSeverity.LEVEL_I}>I 级 (低威胁度)</option>
                  <option value={DefectSeverity.LEVEL_II}>II 级 (中级关注)</option>
                  <option value={DefectSeverity.LEVEL_III}>III 级 (严重预告警)</option>
                  <option value={DefectSeverity.LEVEL_IV}>IV 级 (高危断裂态)</option>
                </select>
              </div>

              {/* UWB Coordinates */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">X坐标 (mm):</label>
                  <input
                    type="text"
                    value={formX}
                    onChange={(e) => setFormX(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">Y高程 (m):</label>
                  <input
                    type="text"
                    value={formY}
                    onChange={(e) => setFormY(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">Z坐标 (mm):</label>
                  <input
                    type="text"
                    value={formZ}
                    onChange={(e) => setFormZ(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Measured values */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">长度 (mm):</label>
                  <input
                    type="text"
                    value={formLength}
                    onChange={(e) => setFormLength(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">宽度 (mm):</label>
                  <input
                    type="text"
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-semibold text-zinc-400 block mb-1">深层 (mm):</label>
                  <input
                    type="text"
                    value={formDepth}
                    onChange={(e) => setFormDepth(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">相控阵超声 (PAUT) 残余壁厚 (mm):</label>
                <input
                  type="text"
                  value={formPautThickness}
                  onChange={(e) => setFormPautThickness(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 outline-none font-mono focus:bg-white focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">多模态定性细节言辞描述:</label>
                <textarea
                  rows={2}
                  placeholder="请输入该隐患处的现场状态或者修补历史情况，字数控制在200字以内..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-zinc-800 outline-none resize-none leading-relaxed text-xs focus:bg-white focus:border-brand-primary transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full p-2.5 bg-brand-primary hover:opacity-95 text-white text-xs font-display font-black rounded-xl cursor-pointer transition-all shadow-md shadow-brand-primary/10"
            >
              登入总账 ledger 并渲染三维孪生
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
