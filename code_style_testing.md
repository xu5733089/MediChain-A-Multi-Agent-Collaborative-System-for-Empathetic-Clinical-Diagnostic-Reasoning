# Code Style & Testing 5分任务总清单（MediChain）

本文档用于跟踪项目在 **Code Style and Testing（25%）** 维度的完成情况，目标是达到评分标准中的 **5分**。

## 1) 评分目标（Definition of Done）

- 代码易读、结构清晰、职责分离明确
- 注释充分且有价值（解释设计动机、边界和风险，而不是重复代码）
- 全项目遵循语言/框架最佳实践（React/FastAPI/Python）
- 测试覆盖全面（单元、集成、异常、回归）
- 测试可复现、稳定，且覆盖率有清晰证据

---

## 2) 全量任务清单（按分类）

> 说明：状态分为 `[ ] 未开始`、`[~] 进行中`、`[x] 已完成`。  
> 分类用于分工与验收，不包含日期计划。

## A. 文档与质量门禁

### 3.1 质量门禁与文档证据

- [x] 前端已配置 ESLint：`medichain-frontend/eslint.config.js`
- [x] 根目录已配置 ESLint：`eslint.config.js`
- [x] 在 README 新增 `Code Style & Testing` 或 `Quality Gates` 章节
- [x] 写明并可执行以下命令：
  - [x] 前端 lint：`npm run lint`
  - [x] 前端格式检查：`npm run format:check`
  - [x] 前端单元测试：`npm run test:run`
  - [x] 前端 E2E：`npm run e2e`（需先启动 `npm run dev`）
  - [x] 后端测试：`pytest -q`
  - [x] 后端覆盖率：`pytest --cov --cov-report=term-missing`
- [x] 明确通过标准（建议）：
  - [x] lint 0 error / 0 warning（`medichain-frontend npm run lint`）
  - [x] 核心流程测试全绿
  - [x] 覆盖率达标（总体 >= 80%，核心 >= 90%）

### 3.2 后端测试基础设施

- [x] 后端依赖已包含 `httpx`：`medichain-backend/requirements.txt`
- [x] 已有安全检查示例脚本：`medichain-backend/test_safety.py`（示例脚本，非 pytest 自动化用例）
- [x] 新建 `medichain-backend/tests/`
- [x] 新建 `medichain-backend/tests/conftest.py`
  - [x] 测试 client fixture
  - [x] 测试数据库 fixture（隔离于生产库）
  - [ ] 测试用户 fixture（patient/provider）
  - [ ] 授权 token fixture
- [x] 增加 `pytest` 和 `pytest-cov` 依赖（如当前环境未安装）

### 3.3 后端 API 集成测试（主链路）

- [~] `POST /api/auth/register`
  - [x] 正常注册
  - [x] 重复用户失败
  - [x] 参数缺失失败
- [~] `POST /api/auth/login/json`
  - [x] 正常登录返回 token
  - [x] 密码错误失败
  - [x] 用户不存在失败
- [~] `POST /api/session/start`
  - [x] 正常创建 session
  - [x] 非法输入/缺失字段失败
- [x] `POST /api/session/chat`
  - [x] 正常对话
  - [x] 非法 session id
  - [x] 未授权访问
- [x] `POST /api/session/diagnose`
  - [x] 正常返回诊断结构
  - [x] 无上下文/异常输入兜底
  - [x] 外部模型失败时服务不崩溃

### 3.3.1 后端 API 集成测试（补充覆盖）

- [x] `POST /api/sessions/{session_id}/messages`
  - [x] 正常写入消息
  - [x] 非会话所有者禁止写入
- [x] `GET /api/sessions/{session_id}/messages`
  - [x] 能读取会话消息列表
- [x] `POST /api/sessions/{session_id}/upload`
  - [x] 文本文件上传成功并入库
- [x] `GET /api/sessions/{session_id}/uploads`
  - [x] 能读取上传文件列表
  - [x] 非会话所有者禁止读取

- [x] `GET /api/session/{session_id}`（读会话详情）
  - [x] 属主可访问；他人 patient 为 403
  - [x] 无 Token 时绑定到用户的会话为 403
  - [x] `provider` 可读取患者会话

- [x] `GET /api/sessions/{session_id}/messages`（与上述权限规则一致 — 非 owner 非 provider 为 403）

- [x] 患者档案 API
  - [x] 创建 / 查询 / 更新 / 删除患者档案
  - [x] 未登录访问患者列表返回 401
  - [x] 非档案所有者访问返回 403

- [x] Provider 审核 API
  - [x] patient 提交 verdict 返回 403
  - [x] provider 提交非法 verdict 返回 400
  - [x] provider 提交有效 verdict 成功

- [x] 删除会话 API
  - [x] 不存在的 session 返回 404
  - [x] 非 owner patient 删除返回 403
  - [x] owner 可删除会话并清理上传文件
  - [x] provider 可删除患者会话

- [x] 文件分析 API
  - [x] TXT 文件分析成功
  - [x] 不支持的扩展名返回 400
  - [x] 文件处理异常返回 400

- [x] MedQA Eval API
  - [x] 题目列表不暴露正确答案
  - [x] 缺失题目返回 404
  - [x] mock 单模型 / 多智能体 / Mistral judge 后可完成评测
  - [x] 评测历史与统计可读取

- [x] Peer Review API
  - [x] session 不存在返回 404
  - [x] 没有诊断结果返回 400
  - [x] 已有缓存时直接返回 cached review
  - [x] mock Mistral review 后生成并缓存结果

- [x] RAG Ingestion API
  - [x] 未登录返回 401
  - [x] patient 角色触发 ingest 返回 403
  - [x] provider 触发但 PubMed 无结果时返回 0 added
  - [x] provider 正常 ingest 成功并返回新增数量

- [x] Compare / OCR API
  - [x] compare 少于 2 个文件返回 400
  - [x] compare 超过 6 个文件返回 400
  - [x] compare 非图片文件返回 400
  - [x] compare 图片对比成功返回分析结果
  - [x] OCR 非图片文件返回 400
  - [x] OCR 图片文件成功返回结构化文本
  - [x] OCR provider 异常返回 400

- [x] 多媒体文件分析 API
  - [x] PDF 文件分析成功
  - [x] 图片文件分析成功并返回 annotations
  - [x] DICOM 文件分析成功并按 image 类型返回
  - [x] 音频文件转写成功
  - [x] 视频文件分析成功

- [x] 多媒体 helper 边界
  - [x] 文件名清洗
  - [x] TXT latin-1 编码兜底
  - [x] PDF 文本提取
  - [x] 图片压缩与 media type 选择
  - [x] Claude Vision annotations JSON 解析与异常兜底
  - [x] DICOM / 音频 / 视频依赖缺失或处理失败兜底

- [x] Streaming API 生成器
  - [x] `/api/session/chat/stream` session 不存在返回 error 事件
  - [x] `/api/session/chat/stream` 正常输出 safety / interviewer / inter-agent / done 事件
  - [x] `/api/session/diagnose/stream` session 不存在返回 error 事件
  - [x] `/api/session/diagnose/stream` 正常输出诊断、评审、roundtable、diagnosis_ready 与 done 事件

- [x] 输入校验与安全边界
  - [x] prompt injection / XSS 输入会被拒绝
  - [x] 注册 username / email / role 校验
  - [x] 症状 severity 校验
  - [x] chat message 空消息和注入校验
  - [x] message role / agent_type 校验
  - [x] patient gender / blood_type 校验
  - [x] eval mode / ingest terms 校验

- [x] Safety 分类模块
  - [x] rule-based 高 / 中 / 低风险分类
  - [x] rule 与 LLM 结果取最高风险
  - [x] LLM JSON 输出解析
  - [x] LLM 非 JSON 输出回退解析
  - [x] LLM provider 异常回退为 low risk

---

## B. 后端单元测试与代码质量

### 3.4 后端核心模块单元测试

- [x] `rag.py`
  - [x] 命中场景
  - [x] 空命中场景
  - [x] 检索异常场景
  - [x] 文档去重与新增 upsert 场景
  - [x] BM25 sparse 向量生成
  - [x] rerank 排序
  - [x] 空引用格式化
  - [x] BM25 词表读写
  - [x] dense / reranker 模型单例缓存
  - [x] Qdrant client 初始化与 collection 创建
  - [x] shutdown close 异常兜底
- [ ] `db.py`
  - [x] 初始化建表
  - [ ] 核心 CRUD
  - [x] 边界输入
- [x] `agents.py`
  - [x] interviewer 输出结构
  - [x] diagnostician 在弱证据场景行为
  - [x] critic 安全告警触发
  - [x] RAG query rewrite 成功与异常兜底
  - [x] RAG query 扩展与去重
  - [x] 图片分析结果转 RAG 查询成功、空输入与异常兜底
  - [x] commentary / roundtable JSON 解析与坏 JSON 兜底
- [~] `export.py`
  - [ ] JSON 导出结构
  - [x] PDF 导出（正常/空数据）
- [x] `eval/judge.py`
  - [x] 维度分数 majority / mean 计算
  - [x] 总分汇总
- [x] `eval/evaluator.py`
  - [x] 单 LLM 输出解析
  - [x] 多智能体 pipeline 输出结构
  - [x] Mistral judge 成功解析与未配置 key 兜底
  - [x] Mistral diagnosis review 结构化解析
- [x] `eval/run_eval.py`
  - [x] scaffold main 可加载 cases 并输出状态
- [x] `ingest.py`
  - [x] PubMed PMID 搜索成功与网络异常
  - [x] PubMed XML article 解析
  - [x] 短摘要 / 空输入跳过
  - [x] ingestion 流程添加文档与空结果跳过
- [x] `agents_async.py`
  - [x] async interviewer / diagnostician / critic 调用
  - [x] RAG query rewrite 失败兜底
  - [x] CoT thinking/text block 解析
  - [x] agent commentary JSON fenced 输出解析与坏 JSON 兜底
  - [x] diagnostic roundtable 输出规范化与异常兜底
- [x] `ingest_jsonl.py`
  - [x] JSONL row 标准化与 question/answer 拼接
  - [x] 空文本跳过
  - [x] JSON decode error 统计
  - [x] reset-db 备份旧数据库目录
  - [x] batch import、重复 ID remap、max-lines 边界
- [x] scaffold / auth 边界
  - [x] `init_db.py` 脚本入口
  - [x] `eval/pipeline_runner.py` scaffold import
  - [x] invalid token / invalid role / missing token 鉴权边界
- [x] `main.py` session / list helper 边界
  - [x] health root 与 RAG status
  - [x] OAuth2 form login 成功与失败
  - [x] latest safety payload 解析与坏 JSON 兜底
  - [x] session messages legacy role 映射
  - [x] session message role / agent_type 校验与写入
  - [x] session JSON 字段解析
  - [x] StrictMode recent session reuse 成功与拒绝分支
  - [x] patient/provider session list SQL filters 与 pagination
  - [x] `/api/session/start` 复用最近未触碰 session
  - [x] `/api/session/chat` 非 interviewing 状态拒绝
  - [x] `/api/session/chat` 12 轮上限自动触发诊断
  - [x] `/api/patients/{patient_id}/sessions` 成功、404、403
  - [x] `/api/analyze/file` 音频与视频分支
  - [x] `/api/session/chat/stream` 非 interviewing / forbidden 错误事件
  - [x] `/api/session/diagnose/stream` forbidden 错误事件
  - [x] `/api/session/diagnose/stream` CoT 失败回退普通 agent 调用
  - [x] `/api/session/diagnose/stream` 上传影像分析阶段事件
  - [x] `/api/sessions` patient/provider 分支与鉴权
  - [x] `/api/provider/sessions` provider-only 鉴权
  - [x] `/api/sessions/{session_id}/uploads` 404 / 403
  - [x] `/api/sessions/{session_id}/upload` 404 / 403 / unsupported / processing error
  - [x] `_analyze_medical_image` 大文件压缩入口
  - [x] `_analyze_dicom` 成功转换、metadata 前缀与缺依赖兜底
  - [x] `_transcribe_audio` 成功、格式转换、无法识别、服务异常、通用异常
  - [x] `_analyze_video` 成功、无帧、单帧分析失败、无法打开、缺依赖

### 3.4.1 覆盖率现状（首次基线）

- [x] 已生成覆盖率报告（`pytest --cov --cov-report=term-missing`）
- [x] 总覆盖率达标（当前 `96%`，目标 `>=80%`）
- [x] 核心模块覆盖率达标（当前：`main.py 91%`、`rag.py 93%`、`agents.py 100%`、`agents_async.py 100%`、`export.py 92%`、`db.py 90%`、`auth.py 96%`、`safety.py 92%`、`eval/evaluator.py 94%`、`eval/judge.py 100%`、`ingest_jsonl.py 97%`；`ingest.py 87%` 为 CLI/网络抓取脚本，已覆盖核心解析与异常）
- [ ] 可选补测模块：`main.py` 剩余少量启动/AUTO_INGEST、DICOM 路由细节、provider peer-review cache 异常分支
- [x] `safety.py` 已从低覆盖提升（当前约 `92%`）

### 3.5 可读性与注释治理

- [x] 清理“翻译代码式”注释（本轮先处理 RAG / 诊断 / Critic 关键路径）
- [x] 在复杂逻辑处补“为什么”注释：
  - [x] RAG 排序与阈值逻辑
  - [x] 诊断触发条件与容错策略
  - [x] 安全策略边界（Critic）
- [ ] 拆分超长函数，控制单函数职责
- [ ] 统一命名风格（布尔前缀、动作函数命名）

---

## C. 前端测试与回归保障

### 3.6 前端测试

- [x] 建立前端测试框架（Vitest + React Testing Library）
- [x] `AuthPage` 测试：
  - [x] 角色切换
  - [x] 登录失败提示
- [x] `MediaUploadZone` 测试：
  - [x] 格式校验
  - [x] 大小限制
  - [x] 上传成功回调
- [x] `ChatPage` 测试：
  - [x] 发送消息
  - [x] loading/禁用态
  - [x] 错误提示
- [x] 前端测试命令已跑通：`npm run test:run`（3 files / 8 tests passed）
- [x] 建立 Cypress E2E 最小框架
  - [x] 新增 `cypress.config.js`
  - [x] 新增 `cypress/e2e/auth.cy.js`
  - [x] 新增 `cypress/e2e/consultation.cy.js`
  - [x] 登录入口角色选择/切换 E2E
  - [x] 问诊主链路 E2E：intake 示例 -> consent -> session start -> chat message send
  - [x] 诊断/导出 E2E：chat trigger -> diagnosis stream -> result page -> PDF/JSON export links
  - [x] Cypress 已跑通：`npm run e2e`（2 specs / 3 tests passed）

### 3.7 回归测试机制

- [x] 收集历史 bug（至少 3 个）
  - [x] 登录失败时没有明确可见反馈风险：`AuthPage.test.jsx`
  - [x] 不支持文件格式被静默忽略风险：`MediaUploadZone.test.jsx`
  - [x] 超大文件进入分析流程风险：`MediaUploadZone.test.jsx`
  - [x] Chat stream 失败时用户看不到错误风险：`ChatPage.test.jsx`
- [x] 每个 bug 新增对应测试用例
- [x] 在 README/报告中标注“回归已锁定”

---

## 3) 交付物检查清单（最终提交前）

- [x] README 中有清晰的质量门禁命令和通过标准
- [x] 测试报告可复现（本地）
- [x] 覆盖率结果可展示（总覆盖 + 核心模块）
- [x] 至少有一组回归测试样例
- [x] 演示链路完整：登录 -> 问诊 -> 诊断 -> 导出 -> 测试证据展示
  - [x] 登录入口 E2E 证据
  - [x] 问诊 intake -> chat E2E 证据
  - [x] 诊断 -> 导出端到端演示证据

---

## 4) 当前进度状态（持续更新，不含日期）

- 当前阶段：`A/B/C 分类任务进行中`
- 当前阻塞：`无`
- 下一验收目标：`最终复核代码质量清单，确认剩余可选项是否需要继续补测`
- 最新测试状态：`210 passed（backend pytest）；8 passed（frontend Vitest）；3 passed（Cypress E2E）`
- 最新覆盖率：`TOTAL 96%（backend pytest-cov）`

---

## 5) 备注

- `medichain-backend/test_safety.py` 当前为手动运行示例，不等同于自动化测试体系。
- 本文档是执行清单，可直接用于团队分工与每日站会更新。
