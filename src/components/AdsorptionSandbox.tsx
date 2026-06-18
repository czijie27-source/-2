import React, { useState, useEffect } from "react";
import { Sliders, Cpu, Activity, Play, RefreshCw, AlertTriangle, HelpCircle, ShieldAlert, Zap } from "lucide-react";
import { CrawlerStatus, RobotTelemetry } from "../types";

export default function AdsorptionSandbox() {
  // PID gains
  const [kp, setKp] = useState(1.45);
  const [ki, setKi] = useState(0.25);
  const [kd, setKd] = useState(0.08);

  // Reference Vacuum Setpoint (kPa, negative value)
  const [refVacuum] = useState(-24.0);
  
  // Realtime simulation state
  const [currentVacuum, setCurrentVacuum] = useState(-24.1);
  const [fanPwm, setFanPwm] = useState(64); // %
  const [powerWatts, setPowerWatts] = useState(410); // W
  const [safetyMargin, setSafetyMargin] = useState(98.2); // %
  const [integrityFactor, setIntegrityFactor] = useState(100); // Surface seal integrity (0-100)

  // Simulation time/tick
  const [simTick, setSimTick] = useState(0);
  const [simHistory, setSimHistory] = useState<{tick: number, ref: number, pk: number, pwm: number, power: number}[]>([]);
  const [activeDisturbance, setActiveDisturbance] = useState<"NONE" | "FLANGE" | "WIND">("NONE");
  const [disturbanceDuration, setDisturbanceDuration] = useState(0);

  // Reset metrics
  const handleReset = () => {
    setKp(1.45);
    setKi(0.25);
    setKd(0.08);
    setCurrentVacuum(-24.1);
    setFanPwm(64);
    setPowerWatts(410);
    setSafetyMargin(98.5);
    setIntegrityFactor(100);
    setSimHistory([]);
    setActiveDisturbance("NONE");
    setDisturbanceDuration(0);
  };

  // Trigger disturbances
  const triggerFlangeDisturbance = () => {
    setActiveDisturbance("FLANGE");
    setDisturbanceDuration(25); // ticks duration
    setIntegrityFactor(55); // Severe vacuum leakage when passing over joint flange gaps!
  };

  const triggerWindDisturbance = () => {
    setActiveDisturbance("WIND");
    setDisturbanceDuration(40); // ticks duration
  };

  // Run continuous simulation step loop
  useEffect(() => {
    let errorSum = 0;
    let lastError = 0;

    const interval = setInterval(() => {
      setSimTick(prev => {
        const nextTick = prev + 1;

        // Base leakage and sealing factor
        let currentSeal = integrityFactor;
        
        // Handle automated recovery for crossing flange
        if (activeDisturbance === "FLANGE") {
          setDisturbanceDuration(dur => {
            if (dur <= 1) {
              setActiveDisturbance("NONE");
              setIntegrityFactor(100); // restored seal
              return 0;
            }
            // Leakage recovers gradually as crawler seals past the flange obstacle
            const progress = (25 - dur) / 25;
            setIntegrityFactor(55 + Math.floor(progress * 45));
            return dur - 1;
          });
        }

        // Handle automated recovery for high crosswind strike
        if (activeDisturbance === "WIND") {
          setDisturbanceDuration(dur => {
            if (dur <= 1) {
              setActiveDisturbance("NONE");
              return 0;
            }
            return dur - 1;
          });
        }

        // Physics engine behavior:
        // Ideal leakage rate based on sealing integrity
        const leakCoefficient = (105 - currentSeal) * 0.15; // lower integrity = higher air leak
        
        // Target setpoint fluctuates under strong crosswind (needs higher vacuum to resist overturning)
        const adjustedTarget = activeDisturbance === "WIND" ? -28.0 : refVacuum;

        // Current error e_k
        const err = adjustedTarget - currentVacuum;
        errorSum += err;
        // Anti-windup
        errorSum = Math.max(Math.min(errorSum, 50), -50);
        const errDiff = err - lastError;
        lastError = err;

        // PID calculation output (controls Ducted Fan PWM Duty Cycle)
        // High leakage or negative pressure gap pulls PWM higher
        let pidOutput = (kp * err) + (ki * errorSum) + (kd * errDiff);
        
        // Base bias PWM corresponds to sealing current
        let calculatedPwm = 60 + leakCoefficient * 3 - pidOutput;
        // Limit PWM range between 10% and 100%
        calculatedPwm = Math.max(Math.min(calculatedPwm, 100), 10);
        setFanPwm(Math.floor(calculatedPwm));

        // Physics process: Actual vacuum created based on PWM vs Leak coefficient
        // Dynamic formula: Vacuum goes deeper (more negative) with higher PWM, but leaks lift it closer to 0
        const randomFluctuation = (Math.random() - 0.5) * 0.22;
        const targetVacuumPhysics = -((calculatedPwm * 0.4) / (1 + leakCoefficient * 0.12)) + randomFluctuation;
        
        // First order inertial response of pneumatic chamber
        const alpha = 0.35; // speed coefficient
        const nextVacuum = currentVacuum * (1 - alpha) + targetVacuumPhysics * alpha;
        setCurrentVacuum(Math.round(nextVacuum * 100) / 100);

        // Power consumption model (410W Cruise, 1500W surge peaks)
        let calculatedPower = Math.floor(410 + Math.pow(calculatedPwm / 100, 2) * 1090);
        if (activeDisturbance === "FLANGE") {
          calculatedPower = Math.floor(calculatedPower * 1.15); // electric surcharge due to slip friction
        }
        setPowerWatts(calculatedPower);

        // Safety margins calculations
        // Under -20 kPa is absolute safety (98%+)
        // Above -15 kPa drops exponentially (extremely high accident drop probabilities)
        let margin = 100 - Math.pow(Math.abs(nextVacuum + 30) / 30, 2.5) * 50;
        if (nextVacuum > -16.0) {
          margin = Math.max(10, 50 - (nextVacuum + 16) * 12);
        }
        setSafetyMargin(Math.round(Math.max(5, Math.min(margin, 99.8)) * 10) / 10);

        // Record history for graphs tracking (limit to 50 samples)
        setSimHistory(hist => {
          const nextHist = [...hist, {
            tick: nextTick,
            ref: adjustedTarget,
            pk: nextVacuum,
            pwm: calculatedPwm,
            power: calculatedPower
          }];
          if (nextHist.length > 50) {
            nextHist.shift();
          }
          return nextHist;
        });

        return nextTick;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [kp, ki, kd, integrityFactor, activeDisturbance, currentVacuum]);

  // Graph plotting helper
  const maxHistoryCount = 50;
  // Convert simulation coordinates to SVG geometry
  const width = 500;
  const height = 180;
  
  // Custom scale: Vacuum range -35 to 0 maps to 10 to 170 in Y
  const mapVacuumToY = (v: number) => {
    return 170 - ((Math.abs(v) / 35) * 160);
  };

  // Build SVG path strings
  let pkPath = "";
  let refPath = "";
  let pwmPath = "";

  if (simHistory.length > 1) {
    simHistory.forEach((pt, i) => {
      const x = (i / (maxHistoryCount - 1)) * (width - 40) + 20;
      const yPk = mapVacuumToY(pt.pk);
      const yRef = mapVacuumToY(pt.ref);
      const yPwm = 170 - (pt.pwm / 100) * 140; // secondary axis

      if (i === 0) {
        pkPath = `M ${x} ${yPk}`;
        refPath = `M ${x} ${yRef}`;
        pwmPath = `M ${x} ${yPwm}`;
      } else {
        pkPath += ` L ${x} ${yPk}`;
        refPath += ` L ${x} ${yRef}`;
        pwmPath += ` L ${x} ${yPwm}`;
      }
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="vacuum-sandbox-frame">
      {/* Parameters Panel (Glass card) */}
      <div className="xl:col-span-4 glass-panel rounded-xl p-5 flex flex-col space-y-5" id="pid-control-panel">
        <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
          <span className="font-display font-bold text-zinc-900 tracking-tight text-sm flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-brand-primary" /> 负压自适应 PID 参数调谐
          </span>
          <button 
            onClick={handleReset}
            className="p-1 px-2.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 font-mono text-xxs flex items-center gap-1 cursor-pointer transition-all font-semibold"
          >
            <RefreshCw className="w-3 h-3" /> 重置参数
          </button>
        </div>

        {/* Sliders loop */}
        <div className="space-y-4 pt-1">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-zinc-600 font-bold">比例增益 (Kp - Proportional)</span>
              <span className="text-brand-primary font-bold">{kp.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="4.0" 
              step="0.05"
              value={kp}
              onChange={(e) => setKp(parseFloat(e.target.value))}
              className="w-full accent-brand-primary cursor-pointer h-1.5 bg-zinc-100 rounded-lg outline-none"
            />
            <span className="text-[10px] text-zinc-500 leading-normal block mt-1">负责抑制瞬时气压偏斜，Kp较高有利于消除扰动响应，但引发振荡。</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-zinc-600 font-bold">积分时间 (Ki - Integral)</span>
              <span className="text-brand-primary font-bold">{ki.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.5" 
              step="0.05"
              value={ki}
              onChange={(e) => setKi(parseFloat(e.target.value))}
              className="w-full accent-brand-primary cursor-pointer h-1.5 bg-zinc-100 rounded-lg outline-none"
            />
            <span className="text-[10px] text-zinc-500 leading-normal block mt-1">消除密封圈不绝对平坦导致的长周期静差。Ki较大可克服静摩擦空隙。</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-zinc-600 font-bold">微分阻尼 (Kd - Derivative)</span>
              <span className="text-brand-primary font-bold">{kd.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="0.8" 
              step="0.02"
              value={kd}
              onChange={(e) => setKd(parseFloat(e.target.value))}
              className="w-full accent-brand-primary cursor-pointer h-1.5 bg-zinc-100 rounded-lg outline-none"
            />
            <span className="text-[10px] text-zinc-500 leading-normal block mt-1">阻尼高频外部横风引发的结构微震动。过大引发风扇转速频繁波动。</span>
          </div>
        </div>

        {/* Disturbances generator box */}
        <div className="pt-3.5 border-t border-zinc-100 space-y-3">
          <span className="font-display font-medium text-xs text-zinc-600 block tracking-wider uppercase">自适应工况测试干扰舱</span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={triggerFlangeDisturbance}
              disabled={activeDisturbance === "FLANGE"}
              className={`p-2.5 rounded-lg text-xs font-semibold font-sans border text-center transition-all cursor-pointer ${
                activeDisturbance === "FLANGE"
                  ? "bg-red-50 border-red-300 text-red-600 animate-pulse font-bold"
                  : "bg-zinc-50 border-zinc-200 hover:border-red-300 hover:bg-red-50/40 text-zinc-700"
              }`}
            >
              🚀 过变法兰漏气隙
            </button>
            <button
              onClick={triggerWindDisturbance}
              disabled={activeDisturbance === "WIND"}
              className={`p-2.5 rounded-lg text-xs font-semibold font-sans border text-center transition-all cursor-pointer ${
                activeDisturbance === "WIND"
                  ? "bg-orange-50 border-brand-primary text-brand-primary animate-pulse font-bold"
                  : "bg-zinc-50 border-zinc-200 hover:border-brand-primary/40 hover:bg-brand-primary/5 text-zinc-700"
              }`}
            >
              🌪️ 14.8m/s 突发横风
            </button>
          </div>
          <span className="text-[10.5px] text-zinc-500 leading-relaxed block bg-zinc-50 rounded-lg p-3 border border-zinc-150 font-sans font-medium">
            <strong className="text-zinc-700 block mb-1">测试说明:</strong> 
            - <strong>法兰测试:</strong> 模拟穿越塔筒联接缝导致的真空腔隙漏度，漏气度陡增。PID需全力提拉涵道转速至 1.5kW。
            <br />
            - <strong>横风测试:</strong> 强气压剪切力打乱腔体受力，气动环路主动增加安全负压负荷至更稳固的 <strong>-28.0 kPa</strong>。
          </span>
        </div>
      </div>

      {/* Real-time Display and Chart Plot Column (Glass card) */}
      <div className="xl:col-span-8 glass-panel rounded-xl p-5 flex flex-col justify-between" id="dynamic-display-column">
        {/* Top summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="sandbox-metrics-grid">
          <div className="bg-white/20 border border-white/30 p-4 rounded-xl flex flex-col space-y-1 shadow-xs backdrop-blur-md">
            <span className="text-[10px] text-zinc-500 font-display font-medium uppercase tracking-widest font-mono font-extrabold">腔体压力 (P_k)</span>
            <span className={`text-lg font-mono font-extrabold tracking-tight ${currentVacuum > -18.0 ? "text-red-500 font-extrabold text-shadow-sm" : "text-brand-primary"}`}>
              {currentVacuum} kPa
            </span>
            <div className="text-[9px] text-zinc-650 font-mono font-bold">目标: {activeDisturbance === "WIND" ? "-28.0" : "-24.0"} kPa</div>
          </div>

          <div className="bg-white/20 border border-white/30 p-4 rounded-xl flex flex-col space-y-1 shadow-xs backdrop-blur-md">
            <span className="text-[10px] text-zinc-500 font-display font-medium uppercase tracking-widest font-mono font-extrabold">风扇 PWM 占空比</span>
            <span className="text-lg font-mono font-extrabold text-zinc-900 tracking-tight">
              {fanPwm}%
            </span>
            <div className="text-[9px] text-zinc-650 font-mono font-bold">控制方向: {currentVacuum > -24.0 ? "反向加速" : "平稳阻尼"}</div>
          </div>

          <div className="bg-white/20 border border-white/30 p-4 rounded-xl flex flex-col space-y-1 shadow-xs backdrop-blur-md">
            <span className="text-[10px] text-zinc-500 font-display font-medium uppercase tracking-widest font-mono font-extrabold">涵道电网功耗</span>
            <span className="text-lg font-mono font-extrabold text-zinc-900 tracking-tight flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-brand-primary" /> {powerWatts} W
            </span>
            <div className="text-[9px] text-zinc-650 font-mono font-bold">母线电压: DC 48.0V</div>
          </div>

          <div className="bg-white/20 border border-white/30 p-4 rounded-xl flex flex-col space-y-1 shadow-xs backdrop-blur-md">
            <span className="text-[10px] text-zinc-500 font-display font-medium uppercase tracking-widest font-mono font-extrabold">抗坠安全系数</span>
            <span className={`text-lg font-mono font-extrabold tracking-tight ${safetyMargin < 80 ? "text-red-500 font-extrabold" : "text-emerald-700 font-extrabold"}`}>
              {safetyMargin}%
            </span>
            <div className="text-[9px] text-zinc-650 font-mono font-bold">阈值下限: 75.0%</div>
          </div>
        </div>

        {/* Real-time Oscilloscope Visualization (Dark style for premium instrumentation feedback) */}
        <div className="space-y-3 my-5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>PID 实测物理波形跟踪</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#00f3ff]" /> 实测负压</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-brand-primary" /> 控制指令</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#39ff14] stroke-dash" /> 期望路径</span>
            </div>
          </div>

          <div className="relative border border-zinc-900 rounded-xl bg-zinc-950 p-1.5 overflow-hidden shadow-lg">
            <svg className="w-full h-[180px]" viewBox={`0 0 ${width} ${height}`}>
              {/* Back grids */}
              {Array.from({length: 6}).map((_, idx) => {
                const y = 10 + (idx * 32);
                return (
                  <line 
                    key={idx} 
                    x1="0" 
                    y1={y} 
                    x2={width} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="1" 
                  />
                );
              })}
              {Array.from({length: 10}).map((_, idx) => {
                const x = 20 + (idx * 48);
                return (
                  <line 
                    key={idx} 
                    x1={x} 
                    y1="0" 
                    x2={x} 
                    y2={height} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="1" 
                  />
                );
              })}

              {/* Dynamic paths plotted */}
              {simHistory.length > 1 && (
                <>
                  {/* Target reference pressure */}
                  <path d={refPath} fill="none" stroke="#39ff14" strokeWidth="1.5" strokeDasharray="3 3" />
                  {/* Current physical vacuum */}
                  <path d={pkPath} fill="none" stroke="#00f3ff" strokeWidth="2.5" className="drop-shadow-[0_0_4px_rgba(0,243,255,0.4)]" />
                  {/* Fan PWM effort */}
                  <path d={pwmPath} fill="none" stroke="#ff6a00" strokeWidth="1.2" className="opacity-75" />
                </>
              )}

              {/* Disturbance markers on chart */}
              {activeDisturbance !== "NONE" && (
                <g transform={`translate(${width - 120}, 30)`} className="font-mono">
                  <rect width="105" height="24" rx="4" fill="rgba(239, 68, 68, 0.18)" stroke="#ef4444" strokeWidth="1" />
                  <text x="8" y="15" fill="#ef4444" fontSize="9" fontWeight="bold">
                    {activeDisturbance === "FLANGE" ? "⚠️ 穿越螺栓法兰中" : "⚠️ 遇强向切变剪力"}
                  </text>
                </g>
              )}
            </svg>
            <div className="absolute bottom-2 left-3 text-[8.5px] font-mono text-zinc-500 font-medium">
              轴采样频率: 8.3Hz | 多重紧耦合负压补偿模型
            </div>
          </div>
        </div>

        {/* Dynamic Physics Simulation explanations */}
        <div className="bg-[#fbfcff] border border-zinc-150 rounded-xl p-4 flex flex-col md:flex-row md:items-start gap-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 mb-1 flex items-center gap-2">
              驭风C-1 风扇闭环差动补偿反馈逻辑
            </h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
              本数字仿真吸附沙盒旨在对风机塔筒过变径焊缝、跨外壁加强斜拉筋与强气流扰动机壳姿态下的吸附安全进行本质保障演算。
              当机器人穿越钢结构螺栓法兰凸缘（隙缝溢气，Integrity 降至 55%）时，比例差速调节器在瞬间（微秒级）将风压功率（DC直流母线功耗）最大攀升至 <span className="text-brand-primary font-bold">1480W 极限抗拉拔挡位</span>，确保设备不随交变外风卷落。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
