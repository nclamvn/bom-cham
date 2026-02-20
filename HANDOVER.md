# Handover — Vấn đề cần fix

Ngày tạo: 2026-02-20
Nguồn: X-ray audit khả năng chăm sóc người già

---

## CRITICAL — Phải fix trước khi deploy thật

### 1. SOS button không trigger ngay lập tức

**Vấn đề:** HA WebSocket nhận `state_changed` cho `sensor.sos_button_action` nhưng chỉ update cache. Không có code route event → skill. Nút SOS vật lý bấm → chờ tối đa 5 phút (cron cycle) mới phản hồi.

**File liên quan:**
- `extensions/home-assistant-mcp/index.ts` (lines 224-228) — handler chỉ gọi `haCache.onStateChanged()`
- `skills/eldercare-sos/SKILL.md` — mô tả 3 trigger nhưng trigger 1 (physical button) không có code route

**Cần làm:** Thêm event handler trong HA extension: khi `sensor.sos_button_action` hoặc `binary_sensor.*_fall_detected` thay đổi → gọi `enqueueSystemEvent()` hoặc tương đương để invoke skill ngay lập tức (< 1 giây).

---

### 2. SOS escalation timer không hoạt động

**Vấn đề:** SKILL.md ghi "đợi 3 phút rồi escalate Level 2" nhưng LLM không thể `setTimeout()`. Một agent turn là synchronous request-response — không pause 180 giây thật được. Toàn bộ escalation chain (Level 1 → 3 min → Level 2 → 3 min → Level 3) là prompt-only, không có timer thật.

**File liên quan:**
- `skills/eldercare-sos/SKILL.md` (lines 130-147) — mô tả escalation timing
- `src/cron/isolated-agent/run.ts` — agent turn runner, không hỗ trợ delayed execution

**Cần làm:** Implement SOS escalation state machine ở gateway side với real timers. Khi SOS triggered:
1. Ngay lập tức: light + TTS + snapshot + Zalo Level 1
2. Gateway đặt timer 180s → check memory `eldercare_sos_active` → nếu chưa cancel → Level 2
3. Gateway đặt timer 180s nữa → Level 3

Có thể dùng cron 1-phút của offline-queue để poll SOS state, hoặc tạo dedicated timer mechanism.

---

## HIGH — Cần fix sớm

### 3. Cron schedule không tự đăng ký từ SKILL.md

**Vấn đề:** SKILL.md frontmatter có field `schedule` (ví dụ `"expr": "*/5 * * * *"`) nhưng `resolveOpenClawMetadata()` không parse nó. Type `OpenClawSkillMetadata` không có field `schedule`. User phải đăng ký cron thủ công qua UI cho từng skill.

**File liên quan:**
- `src/agents/skills/frontmatter.ts` (lines 103-157) — `resolveOpenClawMetadata()` bỏ qua `schedule`
- `src/agents/skills/types.ts` (lines 19-33) — `OpenClawSkillMetadata` type thiếu `schedule`
- `src/gateway/server-cron.ts` — `buildGatewayCronService()`

**Cần làm:**
1. Thêm `schedule` vào `OpenClawSkillMetadata` type
2. Parse `schedule` trong `resolveOpenClawMetadata()`
3. Tự động register cron jobs khi gateway startup từ parsed schedules
4. Reconcile: nếu user đã tạo cron thủ công → không duplicate

**Skills có cron cần tự đăng ký:**

| Skill | Schedule | Timezone |
|-------|----------|----------|
| eldercare-monitor | `*/5 * * * *` | Asia/Ho_Chi_Minh |
| eldercare-offline-queue | `* * * * *` | Asia/Ho_Chi_Minh |
| eldercare-medication | `0 7,12,18,21 * * *` | Asia/Ho_Chi_Minh |
| eldercare-daily-report | `0 21 * * *` | Asia/Ho_Chi_Minh |
| eldercare-sleep-tracker | `0 6 * * *` | Asia/Ho_Chi_Minh |
| eldercare-exercise | `0 9 * * *` | Asia/Ho_Chi_Minh |
| eldercare-companion | `0 8,10,12,14,16,18,20 * * *` | Asia/Ho_Chi_Minh |
| eldercare-videocall | `0 8,9 * * *` | Asia/Ho_Chi_Minh |
| eldercare-weather-alert | `0 6,18 * * *` | Asia/Ho_Chi_Minh |
| eldercare-multi-room | `*/5 * * * *` | Asia/Ho_Chi_Minh |
| eldercare-visitor-log | `*/10 * * * *` | Asia/Ho_Chi_Minh |

---

### 4. voice-call extension thiếu

**Vấn đề:** SOS Level 2 gọi `voice_call` tool nhưng `extensions/voice-call/` không tồn tại trong repo. Test file `src/plugins/voice-call.plugin.test.ts` import từ `../../extensions/voice-call/index.js` — file không có. Phone escalation = dead end.

**Cần làm:** Một trong hai:
- (A) Implement `extensions/voice-call/` — dùng Twilio/Vonage API để gọi điện thoại thật
- (B) Bỏ Level 2 phone, chuyển thẳng Level 1 Zalo → Level 2 gọi TẤT CẢ contacts qua Zalo + Telegram

---

## MEDIUM

### 5. HA WebSocket thiếu ping/keepalive

**Vấn đề:** HA đóng WebSocket sau ~60s idle. Reconnect logic có (exponential backoff) nhưng tạo gap window mất events.

**File:** `extensions/home-assistant-mcp/ha-events.ts`

**Cần làm:** Gửi ping frame mỗi 30s để giữ connection alive.

---

### 6. UI dashboard fetch ALL HA entities

**Vấn đề:** `eldercare.ts` controller gọi `get_states` (dump toàn bộ 1000+ entities) để đọc 4 sensors. Lãng phí bandwidth và context.

**File:** `ui/src/ui/controllers/eldercare.ts` (lines 484-489)

**Cần làm:** Dùng `get_state` per entity_id thay vì `get_states` bulk.

---

## LOW

### 7. Không có eldercare integration tests

**Vấn đề:** Zero test cho flow eldercare end-to-end. Cron infra có test, HA client không có test, skill logic không có test.

**Cần làm:** Thêm test cho ít nhất:
- HA client REST calls (mock fetch)
- SOS trigger → notification flow (mock tools)
- Cron schedule auto-registration
- Memory key format validation cho mỗi skill

---

## Tham khảo: Kiến trúc LLM-as-executor

Toàn bộ 16 eldercare skills là SKILL.md files (prompt-as-code). LLM đọc instructions và thực thi bằng tool calls. Hạ tầng (HA, Zalo, Telegram, memory, cron) là real code. Decision logic (fall pattern matching, medication window, report aggregation) là LLM inference.

**Điểm mạnh:** Linh hoạt, dễ thêm/sửa skill bằng Markdown, không cần compile.
**Điểm yếu:** Reliability phụ thuộc LLM instruction-following. Không có timer, sleep, hoặc async wait trong agent turn.

### Key files

```
# Gateway cron
src/gateway/server-cron.ts
src/cron/service/timer.ts
src/cron/isolated-agent/run.ts

# Skill loading
src/agents/skills/workspace.ts
src/agents/skills/frontmatter.ts
src/agents/skills/types.ts

# HA extension
extensions/home-assistant-mcp/index.ts
extensions/home-assistant-mcp/ha-client.ts
extensions/home-assistant-mcp/ha-events.ts
extensions/home-assistant-mcp/ha-entities.ts

# Channels
extensions/telegram/src/channel.ts
extensions/zalo/src/send.ts

# UI eldercare
ui/src/ui/controllers/eldercare.ts
ui/src/ui/views/eldercare-dashboard.ts
ui/src/ui/views/eldercare-config.ts
```
