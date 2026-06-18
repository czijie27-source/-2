import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Init server-side Gemini client with teleport headers
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // RobotGPT AI Diagnostic Expert Assistant endpoint
  app.post("/api/diagnose", async (req, res) => {
    try {
      const { defectType, location, size, pautThickness, imuVelocity, currentCondition } = req.body;
      
      if (!ai) {
        // Fallback response with beautiful mock data if no key configured, to ensure seamless user trial
        const fallbackText = `### 《风机结构健康智能诊断报告》

**设备状态诊断结果**：🔔 **III 级 (严重病害 - 建议计划内维修)**

#### 一、病害基础信息与原位锚定
- **病害类型**: ${defectType || "表面贯穿性裂缝 (Crack)"}
- **三维绝对位置 (UWB + IMU 毫米级)**: \`${location || "X: 25.1m, Y: 185.3m, Z: 5.2m"}\` (位于风机中上段塔筒风载应力集中区)
- **病害尺寸测量**: 长度大约 \`${size || "1220 mm"}\`，其最大宽度为 \`33.2 mm\`
- **隐蔽病害层析测定 (PAUT 相控阵雷达描述)**: 相控阵实测残余厚度仅为 \`${pautThickness || "15.0 mm"}\` (该层理论设计厚度为: *25.0 mm*, 局部刚度削弱 **40%**)
- **外部工况与本体姿态相关性**: 在 ${currentCondition || "常规 410W 巡回, 伴随 5级高空烈风"} 状态下，Honeywell 姿态卡尔曼滤波显示局部在主阵列偏航期间存在 0.12Hz 异常低频扭转共振。

---

#### 二、力学特性衰减与成因分析
根据 **RobotGPT** 风电设备专业知识图谱分析：
1. **成因诊断**：该位置处于塔筒变径切线应力陡增区域，外部长期反复经受 **12.5m/s 高空强交变横风荷载** 产生的卡门涡街共振。在材料焊接边缘，由于热影响区残余拉应力未完全消除，首先产生微观应力腐蚀裂纹。
2. **多模态数据深度融合推导**：
   - 视觉 YOLOv11-SAM 精密分割边缘显示表面裂纹已呈现微曲性扩展（表层氧化破损）。
   - PAUT 相控阵波形反射振幅急剧畸变，验证内部钢材本体局部已产生 **4.5mm 进深的分层 (Delamination) 脱粘**。

---

#### 三、叶片/塔筒结构刚度安全分析
- **结构基频漂移**: 预估塔筒局部截面惯性矩降低 **14.2%**，导致风机一阶抗弯刚度基频由 0.28Hz 漂移至 0.24Hz，逼近叶片转子三叶片掠过阻尼主频段，存在局部共振及屈曲风险。
- **疲劳寿命评估**: 在当前 5 级以上风况下，该应力集中区疲劳微裂纹扩展速率维持在约 \`0.08mm/万次循环\`，严重威胁塔筒结构本质安全。

---

#### 四、针对性维修手段与维保方案
1. **一阶段 (临时应急安全加固)**：
   - 启动底座姿态补偿，在风速大于 15m/s 时主动偏航进入顺桨避挠状态，抑制裂纹快速扩张。
2. **二阶段 (物理缺陷深度修复建议)**：
   - **裂缝止裂打磨**：在裂纹两端精准定位位置钻卸载止裂孔。
   - **深层注浆注塑与补强**：采用高性能低粘度环氧树脂（对复合材料叶片）或高强微膨胀合金灌浆材料进行高压无损固化封堵，恢复残余刚度。
   - **三轴碳纤维贴板增强**：对受损区域外圆弧包覆粘贴双层碳纤维织物；表面涂装环保型抗紫外、耐盐雾型无溶剂聚氨酯防腐面漆，完全阻隔空气侵蚀。

*报告生成时间：${new Date().toLocaleString('zh-CN')} | 智能诊断决策大脑: RobotGPT v2.5*`;

        return res.json({
          success: true,
          report: fallbackText,
          isMock: true
        });
      }

      const prompt = `你现在是 "RobotGPT"（风电设备多模态无人化运维诊断专家大脑）。请针对以下风机运维病害特征，进行深入理化性质分析、受力与承载力学衰减分析、成因判定并自动生成结构化《风机结构健康智能诊断报告》及针对性维修建议：
      病害类型: ${defectType || "表面贯穿性裂缝 (Crack)"}
      三维绝对坐标 (UWB): ${location || "X: 25.1, Y: 185.3, Z: 5.2"}
      病害量化参数 (表面视觉/超声探测): ${size || "长度 1220mm, 最大宽度 33.2mm"}
      深层相控阵超声反射信号 (PAUT残余厚度估计): ${pautThickness || "15mm (设计正常厚度为 25mm)"}
      设备/机器人姿态与横风工况: ${currentCondition || "常规 410W 巡回, 伴随 5级高空烈风"}
      
      请结合专业风电运维物理标准及安全规范，输出包含以下部分的精美报告：
      1. 标题《风机结构健康智能诊断报告》
      2. 状态诊断：必须判断并明确给出病害严重等级：I级(轻微)、II级(中度)、III级(严重)、IV级(极度危险 - 建议立即停机修复)。
      3. 一、病害基础信息与原位锚定 (说明三维坐标及超声层析测定对缺陷的精确表征：如局部刚度削弱比例等)
      4. 二、力学特性衰减与成因分析 (结合风机先验力学模型，自主推理该病害是由内部材料疲劳、应力集中、钢筋锈蚀膨胀、抑或是长期扭转疲劳引起，并引用多模态传感关联)
      5. 三、塔筒/叶片结构安全与寿命预测 (评估基频、截面惯性矩及后续寿命退化)
      6. 四、针对性修复手段与维保方案 (如止裂孔定位、高强微膨胀灌浆、碳纤维加固、聚氨酯防腐面漆喷涂等)
      7. 标注RobotGPT版本及生成时间。
      
      请使用非常严谨、专业、极高工业品质的中文学术/工程语气回答，全篇使用优雅的高清Markdown格式进行排版，字数控制在800字到1200字左右。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({
        success: true,
        report: response.text,
        isMock: false
      });
    } catch (error: any) {
      console.error("Gemini diagnostics error:", error);
      res.status(500).json({ error: error.message || "Failed to generate diagnostics" });
    }
  });

  // Serve static assets and manage frontend SPA routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
