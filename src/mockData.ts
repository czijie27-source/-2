import { WindTurbine, DefectItem, DefectSeverity, DefectType, CrawlerStatus, RobotTelemetry } from "./types";

export const initialTurbines: WindTurbine[] = [
  {
    id: "WTG-01",
    name: "WTG-01 (华北风场A区-01号)",
    status: "NORMAL",
    capacity: "6.2MW",
    hubHeight: 110,
    location: "102.8065° E, 112.3030° N",
    activeClimberId: "YF-Alpha",
    defectCount: 1,
    lastInspected: "2026-06-15 14:30"
  },
  {
    id: "WTG-02",
    name: "WTG-02 (华北风场A区-02号)",
    status: "CAUTION",
    capacity: "6.2MW",
    hubHeight: 110,
    location: "102.8080° E, 112.3045° N",
    activeClimberId: null,
    defectCount: 1,
    lastInspected: "2026-05-28 09:12"
  },
  {
    id: "WTG-03",
    name: "WTG-03 (华北风场A区-03号旗舰风机)",
    status: "ALERT",
    capacity: "7.2MW",
    hubHeight: 120,
    location: "102.8115° E, 112.3082° N",
    activeClimberId: "YF-Beta",
    defectCount: 2,
    lastInspected: "2026-06-17 18:45"
  },
  {
    id: "WTG-04",
    name: "WTG-04 (华北风场A区-04号)",
    status: "NORMAL",
    capacity: "6.2MW",
    hubHeight: 110,
    location: "102.8040° E, 112.3110° N",
    activeClimberId: null,
    defectCount: 0,
    lastInspected: "2026-06-16 11:00"
  },
  {
    id: "WTG-05",
    name: "WTG-05 (华北风场A区-05号)",
    status: "OFFLINE",
    capacity: "6.2MW",
    hubHeight: 110,
    location: "102.8021° E, 112.2995° N",
    activeClimberId: null,
    defectCount: 0,
    lastInspected: "2026-04-12 16:20"
  }
];

export const initialDefects: DefectItem[] = [
  {
    id: "DEF-01",
    type: DefectType.CRACK,
    severity: DefectSeverity.LEVEL_III,
    x: 25.1,
    y: 185.3,
    z: 5.2,
    length: 1220,
    width: 33.2,
    depth: 2.5,
    pautConfidence: 94.6,
    timestamp: "2026-06-17 15:20",
    pautThickness: 15.0,
    isSubsurface: false,
    summary: "焊缝交界应力集中区之纵数向贯穿型疲劳裂痕，表面腐蚀，氧化漆色起鼓。",
    suggestedAction: "打磨卸载抗拉孔，固化环氧砂浆重构表面，打设高强微膨胀水泥锁销补强，附加轻质碳纤维底膜包覆。"
  },
  {
    id: "DEF-02",
    type: DefectType.DELAMINATION,
    severity: DefectSeverity.LEVEL_IV,
    x: 19.8,
    y: 75.0,
    z: 5.0,
    length: 340,
    width: 210,
    depth: 18.2,
    pautConfidence: 98.2,
    timestamp: "2026-06-17 16:10",
    pautThickness: 8.0,
    isSubsurface: true,
    summary: "风机叶片主梁树脂基复合结构层间开裂分层，相控阵超声波反射谱幅急剧畸变，隐蔽脱粘重大灾患。",
    suggestedAction: "应强制避风顺桨运行，指派运维船进驻开展多极局部低沸点聚氨酯高分子树脂压力注胶，彻底重构主复合断层，恢复设计截面承载力矩。"
  },
  {
    id: "DEF-03",
    type: DefectType.VOID,
    severity: DefectSeverity.LEVEL_II,
    x: 30.5,
    y: 3.2,
    z: 4.1,
    length: 85,
    width: 65,
    depth: 12.0,
    pautConfidence: 91.2,
    timestamp: "2026-05-28 09:44",
    pautThickness: 21.2,
    isSubsurface: true,
    summary: "塔筒法兰转接座承台内部局部松空灌浆不饱满。PAUT相控阵超声无损成像判读为内部空洞型蜂窝结构。",
    suggestedAction: "后续常规维保窗口期内开展低压孔道微空注浆。使用水泥基抗渗流高流动度超细自流平堵漏物充填密实。"
  },
  {
    id: "DEF-04",
    type: DefectType.PAINT_PEEL,
    severity: DefectSeverity.LEVEL_I,
    x: 12.0,
    y: 45.2,
    z: 1.2,
    length: 152,
    width: 80,
    depth: 0,
    pautConfidence: 89.0,
    timestamp: "2026-06-15 11:24",
    pautThickness: 25.0,
    isSubsurface: false,
    summary: "塔筒下段外圆受盐雾与温差露点引起的面漆成片老化起皮，未剥露原基底钢板。抗氧化性能略降。",
    suggestedAction: "手动清除污锈皮，高强度抗磨打磨粗糙度，喷涂一底两面高耐磨、耐候型双组份氟碳防腐特种重漆。"
  }
];

export const initialTelemetries: Record<string, RobotTelemetry> = {
  "YF-Alpha": {
    status: CrawlerStatus.SCANNING,
    battery: 88,
    currentSpeed: 0.15,
    operatingPower: 410,
    vacuumP_k: -24.4,
    vacuumP_ref: -24.0,
    pwmDutySelection: 64,
    imuRoll: -1.2,
    imuPitch: 54.0,
    imuYaw: 180.2,
    windSpeed: 8.4,
    overallSafetyMargin: 98.1,
    lasersActive: true,
    pautActive: false
  },
  "YF-Beta": {
    status: CrawlerStatus.ALERT,
    battery: 45,
    currentSpeed: 0.05,
    operatingPower: 1250, // High load peak because of high wind bypass
    vacuumP_k: -23.1,
    vacuumP_ref: -25.0,
    pwmDutySelection: 88, // Compensating extreme winds!
    imuRoll: 32.5,
    imuPitch: 75.2,
    imuYaw: 145.8,
    windSpeed: 14.8,
    overallSafetyMargin: 82.5, // Danger margin due to extreme 14.8m/s crosswind!
    lasersActive: true,
    pautActive: true
  }
};
