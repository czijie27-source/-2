import React, { useState, useEffect, useRef } from "react";
import { WindTurbine, DefectItem, DefectSeverity, DefectType, CrawlerStatus, RobotTelemetry } from "../types";
import { Wind, Radio, MapPin, Activity, ShieldCheck, AlertTriangle, Layers, Zap } from "lucide-react";
import { motion } from "motion/react";

interface TwinMonitorProps {
  turbines: WindTurbine[];
  defects: DefectItem[];
  telemetries: Record<string, RobotTelemetry>;
  selectedTurbine: WindTurbine;
  onSelectTurbine: (t: WindTurbine) => void;
  focusedDefect: DefectItem | null;
  onSelectDefect: (d: DefectItem) => void;
}

export default function TwinMonitor({
  turbines,
  defects,
  telemetries,
  selectedTurbine,
  onSelectTurbine,
  focusedDefect,
  onSelectDefect,
}: TwinMonitorProps) {
  // Blade rotation state
  const [rotation, setRotation] = useState(0);
  const [crawlerProgress, setCrawlerProgress] = useState(35); // 0-100 climbing progress
  const [isClimbingUp, setIsClimbingUp] = useState(true);
  
  // Waveform canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active climber stats
  const activeTele = selectedTurbine.activeClimberId 
    ? telemetries[selectedTurbine.activeClimberId] 
    : null;

  // Rotate blades and animate crawler behavior
  useEffect(() => {
    let animId: number;
    const update = () => {
      setRotation(prev => (prev + (activeTele ? activeTele.windSpeed * 0.4 : 1.5)) % 360);
      
      // Simulate crawler crawling when status is CLIMBING or SCANNING
      if (activeTele && (activeTele.status === CrawlerStatus.SCANNING || activeTele.status === CrawlerStatus.CLIMBING)) {
        setCrawlerProgress(prev => {
          let next = prev + (isClimbingUp ? 0.05 : -0.05);
          if (next >= 75) {
            setIsClimbingUp(false);
            return 75;
          }
          if (next <= 15) {
            setIsClimbingUp(true);
            return 15;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [activeTele, isClimbingUp]);

  // Render Live Ultrasound Waveform in real-time on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw grid lines
      ctx.strokeStyle = "rgba(63, 63, 70, 0.4)";
      ctx.lineWidth = 1;
      // Verticals
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontals
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Base scan thickness parameters
      // If we are inspecting WTG-03 which contains subsurface flaws, simulate reflection signals
      const depthVal = focusedDefect?.isSubsurface ? focusedDefect.depth : 0;
      const remains = focusedDefect ? focusedDefect.pautThickness : 25.0;

      ctx.beginPath();
      ctx.strokeStyle = "#00f3ff"; // Cyber Blue wave
      ctx.lineWidth = 2;
      
      tick += 0.15;
      
      let points: {x: number, y: number}[] = [];
      for (let x = 0; x < w; x++) {
        let y = h / 2; // Midline baseline
        
        // Initial surface transmit pulse (high amplitude near entry x=10 to 45)
        const transmitPulse = Math.sin(x * 0.45) * Math.exp(-Math.pow(x - 25, 2) / 120) * 45;
        y += transmitPulse;

        // Subsurface defect reflection pulse (if focused defect is subsurface or deep)
        if (focusedDefect && focusedDefect.isSubsurface && x > w * 0.35 && x < w * 0.65) {
          const center = w * 0.48;
          // Peak shifts depending on depth of flaw
          const depthPulse = Math.sin(x * 0.6 + tick) * Math.exp(-Math.pow(x - center, 2) / 180) * (depthVal * 2.2);
          y += depthPulse;
        }

        // Backwall reflection pulse (the rear shell boundary, e.g. at remains thickness x=w*0.8)
        // If remaining thickness is small (severe corrosion/wear), the backwall shift leftward (remains < 25)
        const backwallCenter = w * 0.78 - (25 - remains) * 5;
        const backwallPulse = Math.sin(x * 0.38 - tick * 0.5) * Math.exp(-Math.pow(x - backwallCenter, 2) / 140) * 35;
        y += backwallPulse;

        // Random thermal noise
        const noise = (Math.random() - 0.5) * 2.5;
        y += noise;

        points.push({x, y});
      }

      // Draw the wave line
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Highlight the peak thresholds
      if (focusedDefect && focusedDefect.severity === DefectSeverity.LEVEL_IV) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.fillRect(0, 10, w, 35);
        ctx.fillRect(0, h - 45, w, 35);
        
        ctx.fillStyle = "#ef4444";
        ctx.font = "10px JetBrains Mono";
        ctx.fillText("CRITICAL REFLECTION GATE EXCEEDED", 12, 24);
      } else {
        ctx.fillStyle = "rgba(57, 255, 20, 0.08)";
        ctx.fillRect(0, 15, w, 20);
        
        ctx.fillStyle = "#39ff14";
        ctx.font = "10px JetBrains Mono";
        ctx.fillText("SIG GATE: MONITOR ACTIVE", 12, 28);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [focusedDefect]);

  // Color mapping helpers
  const getSeverityBadge = (sev: DefectSeverity) => {
    switch (sev) {
      case DefectSeverity.LEVEL_I:
        return { text: "I级 (轻微)", color: "bg-blue-50 text-blue-600 border-blue-200" };
      case DefectSeverity.LEVEL_II:
        return { text: "II级 (中度)", color: "bg-yellow-50 text-yellow-600 border-yellow-250" };
      case DefectSeverity.LEVEL_III:
        return { text: "III级 (严重)", color: "bg-orange-50 text-orange-600 border-orange-200" };
      case DefectSeverity.LEVEL_IV:
        return { text: "IV级 (高危)", color: "bg-red-50 text-red-600 border-red-200" };
    }
  };

  const getTurbineStatusConfig = (status: string) => {
    switch (status) {
      case "NORMAL":
        return { text: "正常在线", color: "text-emerald-600 border-emerald-200 bg-emerald-50", dot: "bg-emerald-500" };
      case "CAUTION":
        return { text: "待观察", color: "text-yellow-600 border-yellow-200 bg-yellow-50", dot: "bg-yellow-500" };
      case "ALERT":
        return { text: "高预警", color: "text-red-600 border-red-200 bg-red-50", dot: "bg-red-500 animate-pulse" };
      case "OFFLINE":
      default:
        return { text: "离线维护", color: "text-zinc-500 border-zinc-200 bg-zinc-50", dot: "bg-zinc-400" };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="twin-monitor-frame">
      
      {/* 1. Left hand: Turbines selection with modern glass layout */}
      <div className="lg:col-span-3 glass-panel rounded-xl p-4 flex flex-col space-y-4" id="turbines-panel">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-primary" /> 风电厂机组分布
          </span>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-500 font-bold">
            华北 A区
          </span>
        </div>
        <div className="overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
          {turbines.map(t => {
            const isSelected = t.id === selectedTurbine.id;
            const stateCfg = getTurbineStatusConfig(t.status);
            return (
              <button
                key={t.id}
                onClick={() => onSelectTurbine(t)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 backdrop-blur-md ${
                  isSelected 
                    ? "bg-white/70 border-brand-primary shadow-md shadow-brand-primary/5 font-bold scale-[1.01]" 
                    : "bg-white/25 hover:bg-white/40 border-white/30 hover:border-white/60 text-zinc-800"
                }`}
                id={`btn-turbine-${t.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-display text-xs font-bold leading-none ${isSelected ? "text-brand-primary" : "text-zinc-800"}`}>
                    {t.name}
                  </span>
                  <span className={`text-[9px] border rounded-full px-2 py-0.5 flex items-center gap-1 leading-none font-medium ${stateCfg.color}`}>
                    <span className={`w-1 h-1 rounded-full ${stateCfg.dot}`} />
                    {stateCfg.text}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 mt-2.5 pt-2.5 border-t border-white/20 font-mono text-[10px] text-zinc-650">
                  <div>容量: <span className="text-zinc-850 font-extrabold">{t.capacity}</span></div>
                  <div>病害: <span className={t.defectCount > 0 ? "text-brand-primary font-extrabold" : "text-zinc-700 font-extrabold"}>{t.defectCount}</span></div>
                  <div className="col-span-2 mt-0.5 text-xxs">上次巡查: <span className="text-zinc-700 font-medium">{t.lastInspected}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Center column: Live 3D/2.5D Digital Twin Turbine Graphic (Premium Apple Glassmorphic view) */}
      <div className="lg:col-span-5 glass-panel rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xl" id="bim-twin-view">
        {/* Absolute Background scanner mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />
        
        <div className="z-10 flex items-center justify-between border-b border-zinc-200/80 pb-3" id="twin-header">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-mono text-[9px] font-bold animate-pulse">
              BIM 孪生实时映射
            </div>
            <h3 className="font-display font-bold text-zinc-900 text-xs">{selectedTurbine.name}</h3>
          </div>
          <span className="font-mono text-zinc-650 text-[10px] flex items-center gap-1 font-bold">
            <MapPin className="w-3 h-3 text-zinc-400" />
            {selectedTurbine.location.split(",")[0]}
          </span>
        </div>

        {/* 3D wind turbine mockup SVG */}
        <div className="relative w-full h-[400px] flex items-center justify-center py-4" id="digital-illustration">
          <svg className="w-full h-full" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* GIS Ground line */}
            <line x1="20" y1="380" x2="280" y2="380" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M 120 380 Q 150 365 180 380" stroke="rgba(255,106,0,0.2)" strokeWidth="2" fill="none" />

            {/* Foundation bolts anchors */}
            <circle cx="135" cy="380" r="3" fill="#ff6a00" />
            <circle cx="165" cy="380" r="3" fill="#ff6a00" />

            {/* Turbine main Tower (rendered as elegant polygon tapering up) */}
            <polygon points="138,380 162,380 154,120 146,120" fill="url(#towerGrad)" stroke="#52525b" strokeWidth="1.5" />

            {/* Laser point cloud scan sector visualization (when active) */}
            {activeTele && activeTele.lasersActive && (
              <polygon 
                points={`150,${120 + (260 * (100 - crawlerProgress)) / 100} 30,378 270,378`} 
                fill="url(#laserSectorGrad)" 
                className="opacity-40" 
              />
            )}

            {/* Laser scanning sweep line */}
            {activeTele && activeTele.lasersActive && (
              <line 
                x1="45" 
                y1={120 + (260 * (100 - crawlerProgress)) / 100} 
                x2="255" 
                y2={120 + (260 * (100 - crawlerProgress)) / 100} 
                stroke="#ff6a00" 
                strokeWidth="2"
                className="brightness-125 opacity-70 animate-pulse"
              />
            )}

            {/* Clickable Disease Hotspots overlay mapped with height (Y in mm maps on polygon) */}
            {defects.map((def, idx) => {
              // Convert coordinate height (from UWB) to visual SVG y value (range 120m to 380m)
              // Maximum tower height corresponds to 200m in model. Z axis is height.
              const maxSimHeight = 200.0;
              const ratio = def.y / maxSimHeight; // y in mock represents heights
              const hotspotY = 380 - (260 * ratio);
              const isSelected = focusedDefect && focusedDefect.id === def.id;

              // Color of the hotspot depending on severity
              const colorMap = {
                [DefectSeverity.LEVEL_I]: "#3b82f6",
                [DefectSeverity.LEVEL_II]: "#eab308",
                [DefectSeverity.LEVEL_III]: "#f97316",
                [DefectSeverity.LEVEL_IV]: "#ef4444"
              };
              const pulseColor = colorMap[def.severity];

              return (
                <g 
                  key={def.id} 
                  className="cursor-pointer group"
                  onClick={() => onSelectDefect(def)}
                >
                  {/* Outer pulse loop */}
                  <circle 
                    cx="150" 
                    cy={hotspotY} 
                    r={isSelected ? "14" : "8"} 
                    fill="none" 
                    stroke={pulseColor} 
                    strokeWidth="1.5"
                    className="animate-ping opacity-25"
                  />
                  {/* Solid core indicator */}
                  <circle 
                    cx="150" 
                    cy={hotspotY} 
                    r={isSelected ? "6" : "4.5"} 
                    fill={pulseColor}
                    stroke="#18181b"
                    strokeWidth="1.5"
                    className="transition-all duration-300 group-hover:scale-125"
                  />
                  {/* Small popup info text on hover */}
                  <text 
                    x="165" 
                    y={hotspotY + 4} 
                    fill="#18181b" 
                    fontSize="9.5" 
                    fontFamily="Space Grotesk, sans-serif"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none fill-zinc-900 font-extrabold"
                  >
                    {def.type} ({def.id})
                  </text>
                </g>
              );
            })}

            {/* The Climbing Robot visualization */}
            {activeTele && (
              <g transform={`translate(0, ${380 - (260 * crawlerProgress) / 100})`} id="svg-climber">
                {/* Visual link anchor from climber to UWB tower axis */}
                <line x1="140" y1="0" x2="160" y2="0" stroke="#ff6a00" strokeWidth="1" strokeDasharray="2 2" />
                
                {/* Robot body box (mounted on the right outer side of model) */}
                <rect 
                  x="151.5" 
                  y="-16" 
                  width="18" 
                  height="32" 
                  rx="3.5" 
                  fill="#1c1917" 
                  stroke="#ff6a00" 
                  strokeWidth="1.5" 
                />
                {/* Suction fan core spinner */}
                <circle cx="160.5" cy="0" r="4" fill="#1c1917" stroke="#ff6a00" strokeWidth="1" />
                <path d="M 158.5 -2 L 162.5 2" stroke="#ff6a00" strokeWidth="1" />
                <path d="M 162.5 -2 L 158.5 2" stroke="#ff6a00" strokeWidth="1" />
                
                {/* Indicator LED lights */}
                <circle cx="156" cy="-10" r="1.5" fill={activeTele.vacuumP_k < -20 ? "#39ff14" : "#ef4444"} />
                {activeTele.pautActive && (
                  <circle cx="165" cy="11" r="1.5" fill="#00f3ff" className="animate-pulse" />
                )}

                {/* Laser emitter node and ray */}
                <rect x="169.5" y="-5" width="2" height="10" fill="#71717a" />
                <circle cx="170.5" cy="0" r="1.5" fill="#ef4444" />
              </g>
            )}

            {/* Nacelle cabin box on top */}
            <rect x="135" y="100" width="30" height="20" rx="3" fill="url(#nacelleGrad)" stroke="#52525b" strokeWidth="1.5" />
            
            {/* Elegant turbine tail boom */}
            <polygon points="135,107 115,110 115,113 135,116" fill="#71717a" />

            {/* Rotating Rotor hub & curved blades */}
            <g transform={`translate(150, 110) rotate(${rotation})`}>
              <circle cx="0" cy="0" r="7" fill="#f4f4f5" stroke="#52525b" strokeWidth="1" />
              {/* Blade 1 */}
              <path d="M -1 -7 Q -6 -60 0 -95 Q 6 -60 1 -7 Z" fill="#ffffff" stroke="#71717a" strokeWidth="0.5" />
              {/* Blade 2 */}
              <g transform="rotate(120)">
                <path d="M -1 -7 Q -6 -60 0 -95 Q 6 -60 1 -7 Z" fill="#ffffff" stroke="#71717a" strokeWidth="0.5" />
              </g>
              {/* Blade 3 */}
              <g transform="rotate(240)">
                <path d="M -1 -7 Q -6 -60 0 -95 Q 6 -60 1 -7 Z" fill="#ffffff" stroke="#71717a" strokeWidth="0.5" />
              </g>
            </g>

            {/* Definition schema gradients */}
            <defs>
              <linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#71717a" />
                <stop offset="50%" stopColor="#e4e4e7" />
                <stop offset="100%" stopColor="#71717a" />
              </linearGradient>
              <linearGradient id="nacelleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a1a1aa" />
                <stop offset="100%" stopColor="#e4e4e7" />
              </linearGradient>
              <linearGradient id="laserSectorGrad" x1="150" y1="120" x2="150" y2="380">
                <stop offset="0%" stopColor="rgba(255,106,0,0.22)" />
                <stop offset="100%" stopColor="rgba(255,106,0,0)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Floater metrics climber coordinates - now Glass style */}
          {activeTele && (
            <div className="absolute bottom-4 left-4 bg-white/70 border border-white/40 rounded px-3 py-2 font-mono text-[11px] text-zinc-800 space-y-1 backdrop-blur-md select-none shadow-lg">
              <div className="text-zinc-500 font-display font-bold text-[9px] mb-0.5 uppercase tracking-wider">实时位置反馈 (UWB)</div>
              <div>X轴 (弧长): <span className="text-brand-primary font-bold">{(150).toFixed(2)} mm</span></div>
              <div>Y轴 (高程): <span className="text-brand-primary font-bold">{(crawlerProgress * (selectedTurbine.hubHeight / 100)).toFixed(2)} m</span></div>
              <div>Z轴 (深度): <span className="text-brand-blue font-bold">{(crawlerProgress % 4).toFixed(3)} mm</span></div>
            </div>
          )}

          {/* Quick instructions floating badge - now Glass style */}
          <div className="absolute top-4 right-4 bg-white/70 border border-white/40 rounded px-2.5 py-1.5 text-[0.68rem] text-zinc-800 max-w-[150px] leading-relaxed shadow-lg backdrop-blur-md">
            💡 提示: 塔筒上的 <span className="text-red-500 font-bold text-xs">●</span> 为实时与历史隐患，点击聚焦。
          </div>
        </div>

        {/* BOTTOM Status line showing robot mode - Glass style */}
        <div className="bg-white/40 border border-white/20 backdrop-blur-md rounded-lg p-3 flex items-center justify-between" id="telemetry-bar">
          <div className="flex items-center gap-3">
            <Radio className={`w-4 h-4 ${selectedTurbine.activeClimberId ? "text-brand-primary animate-pulse" : "text-zinc-650"}`} />
            <div>
              <div className="text-[9px] text-zinc-500 uppercase font-display tracking-widest font-bold">搭载作业底盘</div>
              <div className="text-xs text-zinc-800 font-bold">
                {selectedTurbine.activeClimberId ? `${selectedTurbine.activeClimberId} (自适应爬壁)` : "挂架未连接"}
              </div>
            </div>
          </div>
          <div className="font-mono text-right text-xs">
            {selectedTurbine.activeClimberId ? (
              <span className="text-brand-primary font-bold animate-pulse text-xs">
                {activeTele?.status === CrawlerStatus.SCANNING ? "多频声自适应扫描" : "锁紧高功吸附"}
              </span>
            ) : (
              <span className="text-zinc-500 text-xs font-bold">STANDBY</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Right Column: Detailed Disease Focus & PAUT ultrasound wave with responsive glass container */}
      <div className="lg:col-span-4 glass-panel rounded-xl p-5 flex flex-col justify-between space-y-5" id="paut-panel">
        <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
          <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand-blue" strokeWidth={2.5} /> 多模态缺陷层析监测
          </span>
          {focusedDefect && (
            <span className="font-mono text-[9px] font-bold text-brand-blue border border-brand-blue/30 px-2 py-0.5 rounded bg-brand-blue/5">
              {focusedDefect.id}
            </span>
          )}
        </div>

        {focusedDefect ? (
          <div className="flex-1 flex flex-col justify-between space-y-4" id="active-defect-details">
            {/* Metadata information card */}
            <div className="bg-zinc-50/80 border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  {focusedDefect.type}
                </h4>
                <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full border font-bold leading-none ${getSeverityBadge(focusedDefect.severity).color}`}>
                  {getSeverityBadge(focusedDefect.severity).text}
                </span>
              </div>
              
              <p className="text-xxs text-zinc-500 leading-normal font-sans font-medium">{focusedDefect.summary}</p>

              {/* Grid of quantitative variables */}
              <div className="grid grid-cols-2 gap-y-2 pt-3 border-t border-zinc-100 font-mono text-[10px] text-zinc-500">
                <div>缺陷长度: <span className="text-zinc-800 font-bold">{focusedDefect.length} mm</span></div>
                <div>缺陷宽度: <span className="text-zinc-800 font-bold">{focusedDefect.width} mm</span></div>
                <div>深度: <span className={focusedDefect.isSubsurface ? "text-brand-blue font-bold" : "text-zinc-500"}>
                  {focusedDefect.isSubsurface ? `${focusedDefect.depth} mm` : "表面缺陷"}
                </span></div>
                <div>PAUT残余厚度: <span className="text-brand-primary font-bold">{focusedDefect.pautThickness} mm</span></div>
                <div className="col-span-2 text-zinc-400 pt-1 flex items-center gap-1">
                  <span>三维原位坐标:</span>
                  <span className="text-zinc-700 font-bold">({focusedDefect.x}, {focusedDefect.y}, {focusedDefect.z})</span>
                </div>
              </div>
            </div>

            {/* Waveform radar block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>PAUT 实时回波波幅 (A-SCAN)</span>
                <span className="text-brand-blue flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                  精检中 ({focusedDefect.pautConfidence}%置信)
                </span>
              </div>
              
              <div className="relative border border-zinc-900 rounded-xl bg-zinc-950 p-1 overflow-hidden h-[155px] shadow-lg">
                <canvas 
                  ref={canvasRef} 
                  width={340} 
                  height={150} 
                  className="w-full h-full block"
                />
                <div className="absolute top-2.5 right-2.5 text-[8.5px] font-mono select-none px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  闸门：实时级联锁
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg text-[10px] text-zinc-500 leading-relaxed font-sans font-medium">
                <span className="text-brand-primary font-bold">相控阵探测提示:</span> 遇内部空洞时声阻阻抗不连续，在缺陷部位提早产生反射能量。上图实测残余壁厚为 <span className="text-zinc-800 font-bold">{focusedDefect.pautThickness}mm</span> (正常为25mm)，缺陷回振波向左偏移。
              </div>
            </div>

            {/* Action advice */}
            <div className="bg-[#fffcf7] border border-brand-primary/15 rounded-xl p-3.5">
              <h5 className="font-display text-xxs font-bold text-brand-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" /> 智能运维应急处置建议：
              </h5>
              <p className="text-[11px] text-zinc-650 leading-relaxed font-sans font-medium">{focusedDefect.suggestedAction}</p>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-2.5 py-16" id="no-defect-selected">
            <AlertTriangle className="w-9 h-9 text-zinc-300" />
            <div className="text-zinc-650 font-bold text-xs font-display">未聚焦探伤隐患</div>
            <p className="text-[10px] text-zinc-400 max-w-[200px] leading-relaxed">
              请在分布区选择风机，或在中间孪生塔筒上点击缺陷原位，获取超声阵列数据。
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}
