/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  WindTurbine, 
  DefectItem, 
  RobotTelemetry, 
  CrawlerStatus, 
  DefectSeverity, 
  DefectType 
} from "./types";
import { 
  initialTurbines, 
  initialDefects, 
  initialTelemetries 
} from "./mockData";
import TwinMonitor from "./components/TwinMonitor";
import AdsorptionSandbox from "./components/AdsorptionSandbox";
import RobotGPTStudio from "./components/RobotGPTStudio";
import ReportArchive from "./components/ReportArchive";

import { 
  Wind, 
  Cpu, 
  Sliders, 
  Layers, 
  FileSpreadsheet, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Info, 
  AlertTriangle,
  Flame,
  ArrowRight,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Global States
  const [turbines, setTurbines] = useState<WindTurbine[]>(initialTurbines);
  const [defects, setDefects] = useState<DefectItem[]>(initialDefects);
  const [telemetries, setTelemetries] = useState<Record<string, RobotTelemetry>>(initialTelemetries);
  
  // Selections
  const [selectedTurbine, setSelectedTurbine] = useState<WindTurbine>(initialTurbines[2]); // WTG-03 is selected by default
  const [focusedDefect, setFocusedDefect] = useState<DefectItem | null>(initialDefects[0]); // DEF-01 is focused by default
  
  // Platform Navigation tabs
  const [activeTab, setActiveTab] = useState<"MONITOR" | "SANDBOX" | "ROBOTGPT" | "DATABASE">("MONITOR");
  
  // Live Clock clock state
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleString("zh-CN", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync focused defect when active turbine changes
  const handleSelectTurbine = (turbine: WindTurbine) => {
    setSelectedTurbine(turbine);
    // Find first defect belonging to this turbine, or default null
    if (turbine.id === "WTG-03") {
      setFocusedDefect(defects[0]); // DEF-01
    } else if (turbine.id === "WTG-01") {
      setFocusedDefect(defects[3]); // DEF-04
    } else if (turbine.id === "WTG-02") {
      setFocusedDefect(defects[2]); // DEF-03
    } else {
      setFocusedDefect(null);
    }
  };

  // Add a new defect manual record
  const handleAddDefect = (newDef: DefectItem) => {
    // Append to defects tracker
    setDefects(prev => [newDef, ...prev]);
    // Set focus
    setFocusedDefect(newDef);
    // Increment count on selected turbine
    setTurbines(prev => prev.map(t => {
      if (t.id === selectedTurbine.id) {
        return {
          ...t,
          defectCount: t.defectCount + 1
        };
      }
      return t;
    }));
    // Sync current selected turbine metrics
    setSelectedTurbine(prev => ({
      ...prev,
      defectCount: prev.defectCount + 1
    }));
  };

  // Update an existing record (such as completing repairs)
  const handleUpdateDefect = (updatedDef: DefectItem) => {
    setDefects(prev => prev.map(d => d.id === updatedDef.id ? updatedDef : d));
    if (focusedDefect && focusedDefect.id === updatedDef.id) {
      setFocusedDefect(updatedDef);
    }
  };

  // Delete/剔除 a record
  const handleDeleteDefect = (id: string) => {
    setDefects(prev => prev.filter(d => d.id !== id));
    if (focusedDefect && focusedDefect.id === id) {
      setFocusedDefect(null);
    }
    setTurbines(prev => prev.map(t => {
      if (t.id === selectedTurbine.id) {
        return {
          ...t,
          defectCount: Math.max(0, t.defectCount - 1)
        };
      }
      return t;
    }));
    setSelectedTurbine(prev => ({
      ...prev,
      defectCount: Math.max(0, prev.defectCount - 1)
    }));
  };

  return (
    <div className="min-h-screen app-bg-image text-zinc-800 font-sans flex flex-col md:flex-row selection:bg-[#ff6a00] selection:text-white" id="main-app-container">
      
      {/* 1. Sidebar Navigation: Premium transparent dark-tilt glassmorphism panel */}
      <aside className="w-full md:w-80 glass-sidebar flex flex-col justify-between h-auto md:h-screen md:sticky md:top-0 shrink-0 z-50 overflow-y-auto" id="platform-sidebar">
        
        <div className="flex flex-col">
          {/* Top Brand Logo Section */}
          <div className="p-5 border-b border-white/10 flex items-center gap-3 select-none">
            <div className="relative flex items-center justify-center p-2 rounded-lg bg-brand-primary shrink-0 shadow-md">
              <Wind className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-white tracking-tight text-sm leading-none uppercase">
                  驭风智眸 YUFENG
                </h1>
                <span className="text-[8px] bg-brand-primary/20 border border-brand-primary/40 text-brand-primary px-1.5 py-0.5 rounded-full font-mono font-bold tracking-widest leading-none">
                  V2.5
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 font-sans mt-1 leading-tight font-medium">
                风电多模态网联协作诊断平台
              </p>
            </div>
          </div>
 
          {/* Navigation Menus with Sidebar style buttons */}
          <div className="px-4 py-4">
            <div className="text-xxs text-zinc-400 font-display font-bold uppercase tracking-wider mb-2.5 px-1">
              导航工作流 / Workflow
            </div>
            <nav className="flex flex-col gap-1.5" id="nav-tabs">
              <button
                onClick={() => setActiveTab("MONITOR")}
                className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "MONITOR" 
                    ? "bg-white/15 backdrop-blur-md text-brand-primary shadow-md font-bold border border-white/20" 
                    : "text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
                id="tab-monitor-btn"
              >
                <Layers className={`w-4 h-4 ${activeTab === "MONITOR" ? "text-brand-primary" : "text-zinc-400"}`} /> 
                <span>双轴巡检孪生</span>
              </button>
              
              <button
                onClick={() => setActiveTab("SANDBOX")}
                className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "SANDBOX" 
                    ? "bg-white/15 backdrop-blur-md text-brand-primary shadow-md font-bold border border-white/20" 
                    : "text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
                id="tab-sandbox-btn"
              >
                <Sliders className={`w-4 h-4 ${activeTab === "SANDBOX" ? "text-brand-primary" : "text-zinc-400"}`} /> 
                <span>动力吸附沙盒</span>
              </button>
              
              <button
                onClick={() => setActiveTab("ROBOTGPT")}
                className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "ROBOTGPT" 
                    ? "bg-white/15 backdrop-blur-md text-brand-primary shadow-md font-bold border border-white/20" 
                    : "text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
                id="tab-robotgpt-btn"
              >
                <Cpu className={`w-4 h-4 ${activeTab === "ROBOTGPT" ? "text-brand-primary" : "text-zinc-400"}`} /> 
                <span>RobotGPT 诊断脑</span>
              </button>
              
              <button
                onClick={() => setActiveTab("DATABASE")}
                className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === "DATABASE" 
                    ? "bg-white/15 backdrop-blur-md text-brand-primary shadow-md font-bold border border-white/20" 
                    : "text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
                id="tab-ledger-btn"
              >
                <FileSpreadsheet className={`w-4 h-4 ${activeTab === "DATABASE" ? "text-brand-primary" : "text-zinc-400"}`} /> 
                <span>缺陷报告总账</span>
              </button>
            </nav>
          </div>
 
          {/* Quick connection spec status lines inside Sidebar */}
          <div className="px-5 py-3 border-t border-white/10 hidden md:block">
            <div className="text-xxs text-zinc-400 font-display font-medium uppercase tracking-wider mb-2">
              数智基底信息
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-zinc-300">
              <div className="flex justify-between">
                <span>负压腔控制器</span>
                <span className="font-bold text-emerald-400">E-Controller Connected</span>
              </div>
              <div className="flex justify-between">
                <span>雷达测距系统</span>
                <span className="font-bold text-white">UWB+IMU Active</span>
              </div>
              <div className="flex justify-between">
                <span>相控阵声波网速</span>
                <span className="font-bold text-brand-blue">450Mbps (Fiber)</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Footer Area with Clock and Connection inside Sidebar */}
        <div className="p-4 bg-transparent border-t border-white/10 flex flex-col gap-2.5" id="nav-clock-info">
          <div className="flex items-center justify-between text-xxs font-mono text-zinc-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <span>联控状态: <strong className="text-white">在线</strong></span>
            </span>
            <span className="font-semibold text-brand-primary">v2.5 Pro</span>
          </div>
          
          <div className="flex items-center gap-2 text-xxs text-zinc-200 font-mono bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{timeStr || "加载中..."}</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content viewport area: transparent with cover background */}
      <div className="flex-1 flex flex-col min-h-screen bg-transparent" id="main-content-panel">

        {/* Top Product Showcase Specs Banner: Styled like DJI.com Product Showcase banner as glass floating card */}
        <section className="glass-panel mx-4 sm:mx-6 mt-6 px-6 py-5 select-none rounded-2xl" id="hardware-showcase">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            <div className="md:col-span-4 space-y-1">
              <span className="text-brand-primary font-display font-black text-[10px] uppercase tracking-widest block">
                工业级无人吸附精检机组
              </span>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 font-display uppercase leading-tight">
                YUFENG C-1 
                <span className="block text-zinc-500 text-xs font-medium font-sans mt-0.5">
                  碳复合负压自适应爬壁机器人
                </span>
              </h2>
              <p className="text-xxs text-zinc-500 leading-relaxed font-sans max-w-sm">
                自研涵道高压电控气动总成，配备双源 UWB+IMU 锁止解算单元，实现变径曲率高海拔 15m/s 位挠稳定性。
              </p>
            </div>

            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5" id="tech-card-specs">
              
              <div className="glass-item p-3 rounded-xl text-left space-y-0.5 shadow-xs">
                <div className="text-xxs text-zinc-500 font-display uppercase tracking-widest font-semibold font-mono">自适应负压腔</div>
                <div className="text-sm font-mono font-extrabold text-zinc-900">-24 kPa</div>
                <p className="text-[9px] text-zinc-500 font-sans">1kHz 动态反馈气动环路</p>
              </div>

              <div className="glass-item p-3 rounded-xl text-left space-y-0.5 shadow-xs">
                <div className="text-xxs text-zinc-500 font-display uppercase tracking-widest font-semibold font-mono">病害实时检测</div>
                <div className="text-sm font-mono font-extrabold text-zinc-900">45 FPS</div>
                <p className="text-[9px] text-zinc-500 font-sans">YOLOv11-SAM 精密分割</p>
              </div>

              <div className="glass-item p-3 rounded-xl text-left space-y-0.5 shadow-xs">
                <div className="text-xxs text-zinc-500 font-display uppercase tracking-widest font-semibold font-mono">无损探伤 (PAUT)</div>
                <div className="text-sm font-mono font-extrabold text-zinc-900">≥800 mm</div>
                <p className="text-[9px] text-zinc-500 font-sans">相控阵超声深层回波检测</p>
              </div>

              <div className="glass-item p-3 rounded-xl text-left space-y-0.5 shadow-xs">
                <div className="text-xxs text-zinc-500 font-display uppercase tracking-widest font-semibold font-mono">定位精度误差</div>
                <div className="text-sm font-mono font-extrabold text-zinc-900">≤3.0 mm</div>
                <p className="text-[9px] text-zinc-500 font-sans">UWB+IMU 原位高精解算</p>
              </div>

            </div>

          </div>
        </section>

        {/* 3. Main Workspace Area: Swapping layout tabs with motion */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-grow" id="cloud-workspace">
          <AnimatePresence mode="wait">
            {activeTab === "MONITOR" && (
              <motion.div
                key="monitor"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22 }}
              >
                <TwinMonitor
                  turbines={turbines}
                  defects={defects}
                  telemetries={telemetries}
                  selectedTurbine={selectedTurbine}
                  onSelectTurbine={handleSelectTurbine}
                  focusedDefect={focusedDefect}
                  onSelectDefect={setFocusedDefect}
                />
              </motion.div>
            )}

            {activeTab === "SANDBOX" && (
              <motion.div
                key="sandbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22 }}
              >
                <AdsorptionSandbox />
              </motion.div>
            )}

            {activeTab === "ROBOTGPT" && (
              <motion.div
                key="robotgpt"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22 }}
              >
                <RobotGPTStudio 
                  defects={defects}
                  focusedDefect={focusedDefect}
                />
              </motion.div>
            )}

            {activeTab === "DATABASE" && (
              <motion.div
                key="database"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22 }}
              >
                <ReportArchive
                  defects={defects}
                  onAddDefect={handleAddDefect}
                  onUpdateDefect={handleUpdateDefect}
                  onDeleteDefect={handleDeleteDefect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer info: Floating glassmorphism matched look */}
        <footer className="glass-panel mx-4 sm:mx-6 mb-6 px-6 py-5 select-none rounded-2xl" id="platform-footer">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between text-[11px] text-zinc-500 font-sans gap-3.5 leading-relaxed">
            <div className="space-y-0.5">
              <p className="font-semibold text-zinc-700">驭风智眸 —— 高效、智能、本质安全的风电设备无人运维倡导者</p>
              <p className="text-[10px] text-zinc-400">技术体系：① 自适应负压吸附电控体系 | ② 多模态 AI 融合检测 (YOLOv11+SAM) | ③ UWB+IMU 紧耦合秒级定位 | ④ RobotGPT 理化推理大脑</p>
            </div>
            <div className="text-left md:text-right font-mono text-zinc-400 text-[10px] space-y-0.5">
              <p>© 2026 驭风智眸无人机组云. 版权所有. 参照 DJI/大疆创新 精英物理硬件管理风尚设计.</p>
              <p>风力电塔筒市场覆盖安全系数认证：BIM+RTAB-Map 1:1高保真数字底盘核证</p>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
