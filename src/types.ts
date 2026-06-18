/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CrawlerStatus {
  STANDBY = "STANDBY",
  CLIMBING = "CLIMBING",
  SCANNING = "SCANNING",
  MAINTAINING = "MAINTAINING",
  ALERT = "ALERT"
}

export enum DefectSeverity {
  LEVEL_I = "LEVEL_I",   // I级 (轻微 - Green/Blue)
  LEVEL_II = "LEVEL_II", // II级 (中度 - Yellow)
  LEVEL_III = "LEVEL_III", // III级 (严重 - Orange)
  LEVEL_IV = "LEVEL_IV"  // IV级 (极度危险 - Red)
}

export enum DefectType {
  CRACK = "表面裂纹",
  PAINT_PEEL = "漆面掉漆",
  DAMAGE = "物理破损",
  OIL_STAIN = "油污油渍",
  VOID = "内部空洞",
  DELAMINATION = "层间脱粘",
  DEEP_CRACK = "深层裂纹"
}

export interface DefectItem {
  id: string;
  type: DefectType;
  severity: DefectSeverity;
  x: number; // UWB coordinates
  y: number;
  z: number;
  length: number;    // Measured parameter mm
  width: number;     // Measured parameter mm
  depth: number;     // Measured parameter mm (0 for surface)
  pautConfidence: number; // Ultrasound / Visual model confidence%
  timestamp: string;
  pautThickness: number; // Remainder steel plate thickness (mm)
  isSubsurface: boolean; // True if detected by PAUT Ultra-sonic rather than Camera
  summary: string;
  suggestedAction: string;
}

export interface RobotTelemetry {
  status: CrawlerStatus;
  battery: number; // %
  currentSpeed: number; // m/s
  operatingPower: number; // W (e.g., 410W cruise, 1.5kW surge)
  vacuumP_k: number; // kPa ( 실시간 feedback )
  vacuumP_ref: number; // kPa ( Target, e.g. -24 kPa )
  pwmDutySelection: number; // %
  imuRoll: number; // Degrees
  imuPitch: number;
  imuYaw: number;
  windSpeed: number; // m/s
  overallSafetyMargin: number; // %
  lasersActive: boolean;
  pautActive: boolean;
}

export interface WindTurbine {
  id: string;
  name: string; // e.g., "WTG-01"
  status: "NORMAL" | "CAUTION" | "ALERT" | "OFFLINE";
  capacity: string; // e.g., "6.2MW"
  hubHeight: number; // meters, e.g. 110m
  location: string; // e.g., "39.54 N, 117.82 E"
  activeClimberId: string | null;
  defectCount: number;
  lastInspected: string;
}

export interface DiagnosticResult {
  reportText: string;
  loading: boolean;
  error: string | null;
  targetDefectId: string | null;
}
