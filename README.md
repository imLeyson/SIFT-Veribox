# SIFT

SIFT 帮助设计师把模糊 Brief 收敛为简洁的设计方向状态。

```text
Brief → 找出最大不确定性 → 一个关键问题 → 回答 → 更新 Design State
                                                   ↓
                                  下一题 / Human Checkpoint
```

每次只问会改变设计判断的问题。也可以在 Brief 上或追问中「一键收敛」到人工检查点，推导会标成待确认，仍由设计师确认。不生成多套路线、搜索计划或长篇设计方案。

## 启动

```bash
npm install
npm run dev
```

打开 [localhost:3000](http://localhost:3000)。无 `LLM_API_KEY` 时运行明确标注的 Mock 示例模式。示例支持完整闭环；任意真实项目应使用 Live。

在本地 `.env.local` 或部署平台环境变量中配置：

```text
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=<your key>
LLM_MODEL=deepseek-flash
LLM_REASONING_EFFORT=medium
```

已配置 Key 的调用失败会报错，不会切回 Mock。请求正文读取与一次可重试错误共享服务端最多 45 秒的预算，客户端 50 秒，可取消、保留草稿并重试。

## 验证

```bash
npm test
npm run lint
npm run build
```

测试覆盖单题问答、不同回答改变方向、不确定时只换问一次、冲突约束更新、人工确认、状态原子提交、迟到响应、草稿恢复、旧数据导入、API 校验与模型超时。

新会话使用 `sift-convergence-v1`。旧 `sift-agent-v1` 数据不删除，仅首次读取原始 Brief 作为草稿。

产品行为与 API 契约见 [收敛 MVP](docs/SIFT_Convergence_MVP.md)。[原 v1 PRD](docs/SIFT_PRD_v1.0.md) 仅作为历史记录。
