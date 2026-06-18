import React, { useState } from "react";
import { DefectItem, DefectType, DefectSeverity } from "../types";
import { Cpu, Send, CheckSquare, Search, BookOpen, AlertCircle, FileText, Printer, Check, Info } from "lucide-react";

interface RobotGPTStudioProps {
  defects: DefectItem[];
  focusedDefect: DefectItem | null;
}

// Simple client side Markdown decorator to render structured replies into gorgeous React nodes
function renderFormattedReport(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Section Headings (###)
    if (line.startsWith("###")) {
      return (
        <h3 key={idx} className="font-display font-black text-[#ff6a00] text-xs mt-5 mb-2 border-l-3 border-[#ff6a00] pl-2 uppercase tracking-wide">
          {line.replace("###", "").trim()}
        </h3>
      );
    }
    // Main Headings (##)
    if (line.startsWith("##")) {
      return (
        <h4 key={idx} className="font-display font-extrabold text-zinc-900 text-sm mt-5 mb-2.5 border-b border-zinc-150 pb-1 mr-2 flex items-center gap-1.5 uppercase tracking-wide">
          {line.replace("##", "").trim()}
        </h4>
      );
    }
    // Strong titles (e.g., **Title**:)
    if (line.startsWith("- **") || line.startsWith("* **")) {
      // split by "**"
      const parts = line.split("**");
      if (parts.length >= 3) {
        return (
          <div key={idx} className="text-[11px] text-zinc-650 ml-4 my-1 line-height-6">
            <span className="text-zinc-400 mr-1.5">•</span>
            <strong className="text-zinc-900 font-bold">{parts[1]}</strong>
            <span>{parts.slice(2).join("")}</span>
          </div>
        );
      }
    }
    // Plain Bullet points (e.g., - or *)
    if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
      return (
        <div key={idx} className="text-[11px] text-zinc-600 ml-5 my-1 leading-normal font-medium">
          <span className="text-brand-primary mr-1.5">•</span>
          {line.replace(/^[-\*]/, "").trim()}
        </div>
      );
    }
    // Inline bold formatting
    if (line.includes("**")) {
      const parts = line.split("**");
      return (
        <p key={idx} className="text-[11px] text-zinc-650 leading-relaxed my-2 font-medium">
          {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-brand-primary font-bold">{p}</strong> : p)}
        </p>
      );
    }
    // Empty line
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }
    // Default paragraph
    return (
      <p key={idx} className="text-[11px] text-zinc-650 leading-relaxed my-1.5 font-medium">
        {line}
      </p>
    );
  });
}

export default function RobotGPTStudio({ defects, focusedDefect }: RobotGPTStudioProps) {
  // Input fields for diagnosing
  const [selectedDefectId, setSelectedDefectId] = useState<string>(focusedDefect?.id || "CUSTOM");
  const [defectType, setDefectType] = useState<string>(focusedDefect?.type || "表面贯穿性剪切裂缝");
  const [locationCoords, setLocationCoords] = useState<string>(focusedDefect ? `X: ${focusedDefect.x}, Y: ${focusedDefect.y}, Z: ${focusedDefect.z}` : "X: 25.1, Y: 185.3, Z: 5.2 (UWB 绝对定位坐标)");
  const [measuredParams, setMeasuredParams] = useState<string>(focusedDefect ? `长度: ${focusedDefect.length}mm, 最大宽度: ${focusedDefect.width}mm, 局进深度: ${focusedDefect.depth}mm` : "长度 1220mm, 最大宽度 33.2mm, 局进深度 2.5mm");
  const [pautThickness, setPautThickness] = useState<string>(focusedDefect ? `${focusedDefect.pautThickness}mm` : "15mm (相控阵实测残余壁原, 设计正常为 25mm)");
  const [currentCondition, setCurrentCondition] = useState<string>("常规 410W 轴巡, 外部高震 5 级交变横风荷载");

  // Free continuous user chat query
  const [customQuestion, setCustomQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Output Diagnose response
  const [loading, setLoading] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"TEMPLATE" | "CONVERSATIONAL">("TEMPLATE");

  // Populate form if Template pre-defined defect changes
  const handleSelectDefectTemplate = (id: string) => {
    setSelectedDefectId(id);
    if (id === "CUSTOM") {
      setDefectType("表面开裂 (手动录入)");
      setLocationCoords("X: 10.0, Y: 20.0, Z: 1.0 (UWB)");
      setMeasuredParams("长度: 50mm, 宽度: 2mm");
      setPautThickness("25mm (正常)");
      return;
    }

    const found = defects.find(d => d.id === id);
    if (found) {
      setDefectType(found.type);
      setLocationCoords(`X: ${found.x}, Y: ${found.y}, Z: ${found.z}`);
      setMeasuredParams(`长度: ${found.length}mm, 宽度: ${found.width}mm, 深度: ${found.depth}mm`);
      setPautThickness(`${found.pautThickness}mm`);
    }
  };

  // Trigger Gemini/RobotGPT HTTP request
  const handleGenerateDiagnosis = async () => {
    setLoading(true);
    setDiagnosticReport(null);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          defectType,
          location: locationCoords,
          size: measuredParams,
          pautThickness,
          currentCondition
        })
      });

      const data = await response.json();
      if (data.success) {
        setDiagnosticReport(data.report);
      } else {
        throw new Error(data.error || "获取智能报告失败");
      }
    } catch (e: any) {
      console.error(e);
      setDiagnosticReport(`### ⚠️ 连接诊断核心失联\n\n风电专用大语言模型 RobotGPT 目前正在执行算法动态微调，或检测到网络延迟。以下为预载入离线诊断建议：\n\n- **临时分析建议**：针对 **${defectType}**，建议指派运维班组攀爬检查；\n- **传感器姿态校验**：确认 UWB 全绝对标定点阻尼是否稳定，避免信号反射干扰。`);
    } finally {
      setLoading(false);
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="robotgpt-studio">
      {/* 1. Left controls column: Diagnostic inputs (Modern glass container) */}
      <div className="lg:col-span-5 glass-panel rounded-xl p-5 flex flex-col justify-between space-y-4" id="diag-inputs">
        <div className="space-y-4">
          <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
            <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-brand-primary" /> RobotGPT 诊断脑核
            </span>
            <div className="flex bg-white/20 backdrop-blur-md rounded-lg p-1 text-[10px] border border-white/25">
              <button 
                onClick={() => setActiveTab("TEMPLATE")}
                className={`p-1 px-2.5 rounded-md cursor-pointer text-xs font-bold transition-all ${activeTab === "TEMPLATE" ? "bg-white/60 text-brand-primary shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                多模态标定源
              </button>
              <button 
                onClick={() => setActiveTab("CONVERSATIONAL")}
                className={`p-1 px-2.5 rounded-md cursor-pointer text-xs font-bold transition-all ${activeTab === "CONVERSATIONAL" ? "bg-white/60 text-brand-primary shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                问答模式
              </button>
            </div>
          </div>

          {activeTab === "TEMPLATE" ? (
            <div className="space-y-3.5 pr-1">
              {/* Selector template */}
              <div>
                <label className="text-[10.5px] font-bold text-zinc-650 block mb-1">聚焦巡检查阅多模态病害预案 :</label>
                <select
                  value={selectedDefectId}
                  onChange={(e) => handleSelectDefectTemplate(e.target.value)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs font-mono outline-none focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer transition-all"
                  id="defect-template-selector"
                >
                  <option value="CUSTOM">-- 手动录入自定义工况轴 --</option>
                  {defects.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.id} - {d.type} (x:{d.x}, y:{d.y})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form entries with beautiful bright inputs */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1 font-semibold">病害多维类型 (Type)</label>
                  <input
                    type="text"
                    value={defectType}
                    onChange={(e) => { setSelectedDefectId("CUSTOM"); setDefectType(e.target.value); }}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1 font-semibold">三维空间原位坐标 (UWB Coordinates)</label>
                  <input
                    type="text"
                    value={locationCoords}
                    onChange={(e) => { setSelectedDefectId("CUSTOM"); setLocationCoords(e.target.value); }}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs font-mono focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1 font-semibold">表面缺陷测量尺寸 (Dimensions)</label>
                  <input
                    type="text"
                    value={measuredParams}
                    onChange={(e) => { setSelectedDefectId("CUSTOM"); setMeasuredParams(e.target.value); }}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs font-mono focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1 font-semibold">相控阵超声 (PAUT) 残壁厚度评估</label>
                  <input
                    type="text"
                    value={pautThickness}
                    onChange={(e) => { setSelectedDefectId("CUSTOM"); setPautThickness(e.target.value); }}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs font-mono focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1 font-semibold">高空力学状态与风阻荷载环境</label>
                  <input
                    type="text"
                    value={currentCondition}
                    onChange={(e) => setCurrentCondition(e.target.value)}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 text-xs focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1 pr-1" id="conversational-mode">
              <div className="bg-[#f0f9ff] px-3.5 py-3 rounded-lg border border-[#bae6fd] text-xxs text-sky-700 flex items-start gap-2.5 font-medium leading-relaxed">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <p>
                  在问答模式中，你可以针对风能物理运维理论实施自由提问。例如：<strong>“叶片层间脱粘的分层临界拉拔剪切常数通常是多少？”</strong>。我们将采用强化领域知识解算。
                </p>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1 font-bold font-mono">向 RobotGPT 提出高精疑问 :</label>
                <textarea
                  rows={6}
                  placeholder="请输入您的风电叶片损伤成因、钢结构防腐喷涂机制或RTAB-Map点云建模误差问题..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100/40 border border-zinc-200 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-zinc-800 text-xs p-3 rounded-lg outline-none resize-none leading-relaxed transition-all"
                />
              </div>

              <button
                onClick={() => {
                  if (!customQuestion.trim()) return;
                  setDefectType("自主提问: " + customQuestion.substring(0, 20));
                  setMeasuredParams("自由语义提问");
                  setLocationCoords("全场空间定位参考");
                  setPautThickness("无超声探指");
                  setCurrentCondition("深度微调问答");
                  handleGenerateDiagnosis();
                }}
                disabled={loading || !customQuestion.trim()}
                className="w-full p-2.5 bg-zinc-900 border border-zinc-900 hover:bg-zinc-800 text-xs text-brand-primary font-display font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> 向 RobotGPT 专家库提问
              </button>
            </div>
          )}
        </div>

        {activeTab === "TEMPLATE" && (
          <button
            onClick={handleGenerateDiagnosis}
            disabled={loading}
            className="w-full lg:mt-4 p-3.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-display font-black border border-brand-primary/20 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            id="btn-trigger-ai-report"
          >
            <Cpu className="w-4 h-4 animate-spin-slow" />
            {loading ? "层析推理逻辑算中..." : "进行 RobotGPT 深度云诊断"}
          </button>
        )}
      </div>

      {/* 2. Right output panel: Rendered PDF-Style Certificate (Glass container) */}
      <div className="lg:col-span-7 glass-panel rounded-xl p-5 flex flex-col justify-between" id="report-output-panel">
        <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
          <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
            <FileText className="w-4.5 h-4.5 text-zinc-400" />
            结构体智能诊断鉴定书 
          </span>
          {diagnosticReport && (
            <button
               onClick={handlePrint}
               className="p-1 px-3.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:text-brand-primary hover:border-brand-primary font-mono text-xxs flex items-center gap-1 cursor-pointer transition-colors font-bold shadow-xs"
            >
              <Printer className="w-3 h-3" /> 导出打印诊断书
            </button>
          )}
        </div>

        {/* Paper visual wrap inside report viewer */}
        <div className="flex-grow my-4 overflow-y-auto max-h-[460px] pr-2 bg-zinc-50 border border-zinc-150 rounded-xl p-4 shadow-inner" id="report-view-plate">
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center space-y-4 py-24" id="ai-loading">
              <div className="relative flex items-center justify-center">
                <span className="w-12 h-12 rounded-full border-2 border-brand-primary/10 border-t-brand-primary animate-spin" />
                <Cpu className="w-5 h-5 text-brand-primary absolute animate-pulse" />
              </div>
              <div className="text-center space-y-1.5 max-w-xs">
                <p className="text-brand-primary text-xs font-bold uppercase tracking-wider animate-pulse">
                  诊断大脑正在开展层析推导
                </p>
                <p className="text-xxs text-zinc-400 leading-relaxed font-sans font-medium">
                  正在联合多模态 UWB+{defectType.slice(0,6)}、PAUT 深层超声回波、表面裂缝轮廓与先验有限元公式，开展失效成因解算，并推演承载应力及剩余寿命...
                </p>
              </div>
            </div>
          ) : diagnosticReport ? (
            <div className="report-paper bg-white text-zinc-800 font-sans text-xs space-y-4 p-5 sm:p-6 rounded-lg border border-zinc-200 shadow-md print:shadow-none print:border-none" id="rendered-content">
              {/* DJI Style watermark / Header logo on top of report certificate */}
              <div className="border-b-2 border-brand-primary/40 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-zinc-900 font-display flex items-center gap-1.5 uppercase leading-none">
                    YUFENG 驭风智眸无人机云
                  </h2>
                  <p className="text-[9px] font-mono text-zinc-450 uppercase tracking-widest font-semibold mt-1">
                    AI POWERED DIAGNOSTIC CERTIFICATE
                  </p>
                </div>
                <div className="text-right font-mono text-[9px] text-zinc-450">
                  <div>报告编号: <span className="text-zinc-800 font-bold">R-GPT2026-WTG</span></div>
                  <div>可信等级: <span className="text-emerald-600 font-bold">99.5%合格</span></div>
                </div>
              </div>

              {/* Real converted structures */}
              <div className="markdown-body select-text text-zinc-700 font-sans font-medium">
                {renderFormattedReport(diagnosticReport)}
              </div>

              {/* Formal Signature box at bottom */}
              <div className="mt-8 pt-4 border-t border-zinc-150 grid grid-cols-2 gap-4 font-mono text-[9px] text-zinc-450">
                <div>
                  云端推送节点: <span className="text-zinc-700 font-bold">ROBOT-GPT-EAST-CLOUD5</span>
                </div>
                <div className="text-right">
                  出具鉴定部门: <span className="text-zinc-800 font-bold">驭风智眸技术评定及寿命审核委员会</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-zinc-400 py-16" id="report-editor-empty">
              <Cpu className="w-10 h-10 text-zinc-300 mb-3" />
              <div className="text-zinc-700 font-bold text-xs font-display">ROBOT-GPT 专家脑虚位以待</div>
              <p className="text-[10px] text-zinc-400 max-w-sm leading-relaxed mt-1 font-medium">
                请在左侧指定风电病害参数，点击 <strong>“进行 RobotGPT 深度云诊断”</strong>。系统将对接高维度叶片拉拽力学、筒体钢材疲劳退化与无人机 RTAB 结构感知链，输出专业结构分析与材料修复方案。
              </p>
            </div>
          )}
        </div>

        {/* Footnote of certification */}
        <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg flex items-center gap-2.5 font-sans text-xxs text-zinc-500 font-medium leading-relaxed">
          <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>
            <strong>先验知识储备:</strong> 已融合累积超 <strong>6,500 次</strong> 深度力学振幅循环迭代训练，覆盖海上强盐雾腐蚀、叶筒开裂、层间脱粘等多维度特种场景。
          </span>
        </div>
      </div>
    </div>
  );
}
