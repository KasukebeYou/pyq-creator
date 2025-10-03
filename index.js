// --- 星标拓展 v0.2.5 (最终稳定版) ---
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, saveChat } from "../../../../script.js";

(function () {
  const MODULE_NAME = '星标拓展';

  // 等待 ST 环境准备
  function ready(fn) {
    if (window.SillyTavern && SillyTavern.getContext) return fn();
    const i = setInterval(() => {
      if (window.SillyTavern && SillyTavern.getContext) {
        clearInterval(i);
        fn();
      }
    }, 200);
    setTimeout(fn, 5000);
  }

  ready(() => {
    try {
      const ctx = SillyTavern.getContext();

      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          apiConfig: {},
          prompts: [],
          chatConfig: { strength: 5, regexList: [] },
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      if (document.getElementById('star-fab')) return;

      const fab = document.createElement('div');
      fab.id = 'star-fab';
      fab.title = MODULE_NAME;
      fab.innerText = '🌟';

      const savedTop = localStorage.getItem('starFabTop');
      const savedRight = localStorage.getItem('starFabRight');
      if (savedTop && savedRight) {
        fab.style.top = savedTop;
        fab.style.right = savedRight;
      } else {
        const centerTop = (window.innerHeight / 2 - 16) + 'px';
        const centerRight = (window.innerWidth / 2 - 16) + 'px';
        fab.style.top = centerTop;
        fab.style.right = centerRight;
      }
      document.body.appendChild(fab);

      (function enableFabDrag() {
        let isDragging = false;
        let startX, startY, startTop, startRight;
        function onMove(e) {
          if (!isDragging) return;
          e.preventDefault();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          const dx = clientX - startX;
          const dy = clientY - startY;
          let newTop = startTop + dy;
          let newRight = startRight - dx;
          const maxTop = window.innerHeight - fab.offsetHeight;
          const maxRight = window.innerWidth - fab.offsetWidth;
          newTop = Math.max(0, Math.min(maxTop, newTop));
          newRight = Math.max(0, Math.min(maxRight, newRight));
          fab.style.top = newTop + 'px';
          fab.style.right = newRight + 'px';
        }
        function onEnd() {
          if (!isDragging) return;
          isDragging = false;
          fab.style.cursor = 'grab';
          localStorage.setItem('starFabTop', fab.style.top);
          localStorage.setItem('starFabRight', fab.style.right);
        }
        function onStart(e) {
          isDragging = true;
          startX = e.touches ? e.touches[0].clientX : e.clientX;
          startY = e.touches ? e.touches[0].clientY : e.clientY;
          startTop = parseInt(fab.style.top, 10);
          startRight = parseInt(fab.style.right, 10);
          fab.style.cursor = 'grabbing';
        }
        fab.addEventListener('mousedown', onStart);
        fab.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
      })();

      const panel = document.createElement('div');
      panel.id = 'star-panel';
      panel.innerHTML = `
        <div class="sp-header">
          <div style="font-weight:600">${MODULE_NAME}</div>
          <div style="font-size:12px; color:#999">v0.2.5</div>
        </div>
        <div class="sp-grid">
          <div class="sp-btn" data-key="api">API配置</div>
          <div class="sp-btn" data-key="prompt">提示词</div>
          <div class="sp-btn" data-key="chat">聊天</div>
          <div class="sp-btn" data-key="worldbook">世界书</div>
          <div class="sp-btn" data-key="gen">生成</div>
        </div>
        <div id="sp-content-area" class="sp-subpanel">
          <div class="sp-small">请选择一个功能</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; color: #999;">调试日志</span>
            <button id="sp-clear-log-btn" style="font-size: 11px; padding: 2px 6px;">清除日志</button>
        </div>
        <div id="sp-debug" class="sp-debug"></div>
      `;
      document.body.appendChild(panel);

      document.getElementById('sp-clear-log-btn').addEventListener('click', () => {
          const dbg = document.getElementById('sp-debug');
          if (dbg) dbg.textContent = '';
      });

      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      function debugLog(...args) {
          const dbg = document.getElementById('sp-debug');
          if (!dbg) return;
          const newText = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          const timestamp = `[${new Date().toLocaleTimeString()}]`;
          dbg.textContent += (dbg.textContent ? '\n' : '') + `${timestamp} ${newText}`;
          dbg.scrollTop = dbg.scrollHeight;
          if (window.DEBUG_STAR_PANEL) console.log(`[${MODULE_NAME}]`, ...args);
      }

      const content = panel.querySelector('#sp-content-area');

      function showApiConfig() {
        content.innerHTML = `
            <div class="sp-section">
            <label>API URL: <input type="text" id="api-url-input"></label><br>
            <label>API Key: <input type="text" id="api-key-input"></label><br>
            <label>模型: <select id="api-model-select"></select></label><br>
            <button id="api-save-btn">保存配置</button>
            <button id="api-test-btn">测试连接</button>
            <button id="api-refresh-models-btn">刷新模型</button>
            <div id="api-status" style="margin-top:6px;font-size:12px;color:lightgreen;"></div>
            </div>
        `;

        const modelSelect = document.getElementById("api-model-select");

        document.getElementById("api-url-input").value = localStorage.getItem("independentApiUrl") || "";
        document.getElementById("api-key-input").value = localStorage.getItem("independentApiKey") || "";
        const savedModel = localStorage.getItem("independentApiModel");

        function populateModelSelect(models) {
            modelSelect.innerHTML = "";
            const uniq = Array.from(new Set(models || []));
            uniq.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
            });
            if (savedModel) {
            let existing = Array.from(modelSelect.options).find(o => o.value === savedModel);
            if (existing) {
                existing.textContent = savedModel + "（已保存）";
                modelSelect.value = savedModel;
            } else {
                const opt = document.createElement("option");
                opt.value = savedModel;
                opt.textContent = savedModel + "（已保存）";
                modelSelect.insertBefore(opt, modelSelect.firstChild);
                modelSelect.value = savedModel;
            }
            } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
            }
        }

        const storedModelsRaw = localStorage.getItem("independentApiModels");
        if (storedModelsRaw) { try { const arr = JSON.parse(storedModelsRaw); if (Array.isArray(arr)) populateModelSelect(arr); } catch {} }
        else if (savedModel) { const opt = document.createElement("option"); opt.value = savedModel; opt.textContent = savedModel + "（已保存）"; modelSelect.appendChild(opt); modelSelect.value = savedModel; }

        document.getElementById("api-save-btn").addEventListener("click", () => {
            const url = document.getElementById("api-url-input").value;
            const key = document.getElementById("api-key-input").value;
            const model = modelSelect.value;
            if (!url || !key || !model) return alert("请完整填写API信息");

            localStorage.setItem("independentApiUrl", url);
            localStorage.setItem("independentApiKey", key);
            localStorage.setItem("independentApiModel", model);

            Array.from(modelSelect.options).forEach(o => {
                if (o.value === model) o.textContent = model + "（已保存）";
                else if (o.textContent.endsWith("（已保存）")) o.textContent = o.value;
            });

            document.getElementById("api-status").textContent = "已保存";
            debugLog("保存API配置", { url, model });
        });

        document.getElementById("api-test-btn").addEventListener("click", async () => {
            const urlRaw = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
            const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
            const model = modelSelect.value || localStorage.getItem("independentApiModel");

            if (!urlRaw || !key || !model) return alert("请完整填写API信息");

            const baseUrl = urlRaw.replace(/\/$/, "");
            document.getElementById("api-status").textContent = "正在向模型发送 ping ...";
            debugLog("测试连接开始", { baseUrl, model });

            try {
                const res = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 100 })
                });

                if (!res.ok) throw new Error(`chat/completions 返回 ${res.status}`);
                const data = await res.json();
                document.getElementById("api-status").textContent = `模型 ${model} 可用（ping 成功）`;
                debugLog("ping 成功", data);
            } catch (e) {
                document.getElementById("api-status").textContent = "连接失败: " + (e.message || e);
                debugLog("ping 失败", e.message || e);
            }
        });

        async function fetchAndPopulateModels(force = false) {
            const url = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
            const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
            if (!url || !key) { document.getElementById("api-status").textContent = "请先填写 URL 和 Key"; debugLog("拉取模型失败", "未配置 URL 或 Key"); return; }
            if (!force && localStorage.getItem("independentApiModelsFetchedAt")) { const ts = new Date(parseInt(localStorage.getItem("independentApiModelsFetchedAt"), 10)); document.getElementById("api-status").textContent = `模型已在 ${ts.toLocaleString()} 拉取过，请点击刷新`; return; }

            try {
                const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`, { headers: { Authorization: `Bearer ${key}` } });
                const data = await res.json();
                debugLog("拉取模型原始返回", data);
                const ids = parseModelIdsFromResponse(data);
                if (ids.length === 0) throw new Error("未解析到模型");
                localStorage.setItem("independentApiModels", JSON.stringify(ids));
                localStorage.setItem("independentApiModelsFetchedAt", String(Date.now()));
                populateModelSelect(ids);
                document.getElementById("api-status").textContent = `已拉取 ${ids.length} 个模型`;
            } catch (e) { document.getElementById("api-status").textContent = "拉取失败: " + e.message; debugLog("拉取模型失败", e.message); }
        }

        function parseModelIdsFromResponse(data) {
            if (!data) return [];
            if (Array.isArray(data.data)) return data.data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data.models)) return data.models.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data)) return data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (data.model) return [data.model];
            if (data.id) return [data.id];
            return [];
        }

        document.getElementById("api-refresh-models-btn").addEventListener("click", async () => {
            debugLog("手动刷新模型");
            await fetchAndPopulateModels(true);
        });

        fetchAndPopulateModels(false);
    }

      function showPromptConfig() {
        content.innerHTML = `
            <div style="padding: 12px; background: #2a2e42; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <textarea rows="3" id="sp-prompt-text" placeholder="输入提示词" style="width: 100%; padding: 8px; border-radius: 4px;"></textarea><br>
                <div id="sp-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #444; padding-top: 6px;"></div>
                <input type="text" id="sp-prompt-search" placeholder="按标签搜索" style="width: 70%; padding: 8px; margin-top: 8px; border-radius: 4px;">
                <button id="sp-prompt-search-btn" style="padding: 8px; margin-left: 8px; border-radius: 4px;">搜索</button>
                <button id="save-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%;">保存提示词</button>
            </div>
        `;
        const PROMPTS_KEY = 'friendCircleUserPrompts';
        let friendCirclePrompts = [];
        let promptTagFilter = "";

        function loadUserPrompts() { friendCirclePrompts = JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); }
        function renderPromptList() {
            const container = document.getElementById('sp-prompt-list');
            container.innerHTML = '';
            friendCirclePrompts.forEach((p, idx) => {
                if (promptTagFilter && !p.tags.some(tag => tag.toLowerCase().includes(promptTagFilter))) return;
                const div = document.createElement('div');
                const row = document.createElement('div');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.checked = p.enabled || false;
                checkbox.addEventListener('change', () => { friendCirclePrompts[idx].enabled = checkbox.checked; localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); });
                const span = document.createElement('span');
                span.textContent = p.text;
                const editBtn = document.createElement('button'); editBtn.textContent = '✏️';
                editBtn.addEventListener('click', () => {
                    const input = document.createElement('input'); input.type = 'text'; input.value = p.text; input.style.flex = '1';
                    row.replaceChild(input, span);
                    input.addEventListener('blur', () => {
                        const newText = input.value.trim();
                        if (newText) { friendCirclePrompts[idx].text = newText; localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); }
                        renderPromptList();
                    }); input.focus();
                });
                const tagBtn = document.createElement('button'); tagBtn.textContent = '🏷️';
                tagBtn.addEventListener('click', () => {
                    const newTag = prompt('输入标签:');
                    if (newTag) {
                        if (!Array.isArray(friendCirclePrompts[idx].tags)) friendCirclePrompts[idx].tags = [];
                        friendCirclePrompts[idx].tags.push(newTag);
                        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); renderPromptList();
                    }
                });
                const delBtn = document.createElement('button'); delBtn.textContent = '❌';
                delBtn.addEventListener('click', () => { friendCirclePrompts.splice(idx, 1); localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); renderPromptList(); });
                row.appendChild(checkbox); row.appendChild(span); row.appendChild(editBtn); row.appendChild(tagBtn); row.appendChild(delBtn);
                div.appendChild(row);
                if (p.tags && p.tags.length > 0) {
                    const tagsRow = document.createElement('div'); tagsRow.style.marginLeft = '20px'; tagsRow.style.marginTop = '6px';
                    p.tags.forEach((t, tIdx) => {
                        const tagEl = document.createElement('span'); tagEl.textContent = t; tagEl.style.cssText = 'display:inline-block; padding:4px 8px; margin:0 6px 6px 0; font-size:12px; border-radius:10px; background:#444; cursor:pointer;'; tagEl.title = '点击删除标签';
                        tagEl.addEventListener('click', () => { friendCirclePrompts[idx].tags.splice(tIdx, 1); localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); renderPromptList(); });
                        tagsRow.appendChild(tagEl);
                    });
                    div.appendChild(tagsRow);
                }
                container.appendChild(div);
            });
        }
        document.getElementById('sp-prompt-search-btn').addEventListener('click', () => { promptTagFilter = document.getElementById('sp-prompt-search').value.trim().toLowerCase(); renderPromptList(); });
        document.getElementById('save-prompts-btn').addEventListener('click', () => { localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts)); alert('提示词已保存'); debugLog('保存用户自定义提示词', friendCirclePrompts); });
        document.getElementById('sp-prompt-text').addEventListener('blur', () => {
            const promptText = document.getElementById('sp-prompt-text').value.trim();
            if (promptText) {
                friendCirclePrompts.push({ text: promptText, enabled: true, tags: [] });
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                document.getElementById('sp-prompt-text').value = '';
                renderPromptList();
            }
        });
        loadUserPrompts(); renderPromptList(); debugLog('进入 提示词配置面板');
    }

     function showChatConfig() {
        content.innerHTML = `
        <div style="padding:12px; border-radius:8px; max-width:500px; margin:0 auto;">
            <div id="sp-chat-slider-container" style="display:flex; align-items:center; margin-bottom:12px;"><span style="margin-right:10px;">读取聊天条数: </span><input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1;"><span id="sp-chat-slider-value" style="margin-left:4px;">10</span></div>
            <div style="margin-bottom:12px;"><h4>正则修剪列表 (不发送)</h4><div style="display:flex; gap:6px; margin-bottom:6px;"><input type="text" id="sp-new-regex" placeholder="<example></example>" style="flex:1;"><button id="sp-add-regex">添加</button></div><div id="sp-regex-list"></div></div>
            <div style="margin-bottom:12px;"><h4>标签筛选列表 (仅发送标签内)</h4><p>如果此列表不为空，则仅发送匹配标签内的内容。</p><div style="display:flex; gap:6px; margin-bottom:6px;"><input type="text" id="sp-new-tag-filter" placeholder="<example>" style="flex:1;"><button id="sp-add-tag-filter">添加</button></div><div id="sp-tag-filter-list"></div></div>
        </div>`;
        const sliderInput = document.getElementById('sp-chat-slider'), sliderValue = document.getElementById('sp-chat-slider-value');
        const savedCount = localStorage.getItem('friendCircleChatCount');
        if (savedCount) { sliderInput.value = savedCount; sliderValue.textContent = savedCount; }
        sliderInput.addEventListener('input', () => { sliderValue.textContent = sliderInput.value; localStorage.setItem('friendCircleChatCount', sliderInput.value); debugLog(`已设置读取聊天条数为 ${sliderInput.value}`); fetchAndCountMessages(); });

        function setupList(containerId, inputId, buttonId, storageKey, type) {
            const container = document.getElementById(containerId), input = document.getElementById(inputId), button = document.getElementById(buttonId);
            const loadList = () => {
                const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
                container.innerHTML = '';
                list.forEach((item, idx) => {
                    const div = document.createElement('div'), checkbox = document.createElement('input'), text = document.createElement('span'), editBtn = document.createElement('button'), delBtn = document.createElement('button');
                    checkbox.type = 'checkbox'; checkbox.checked = item.enabled; checkbox.addEventListener('change', () => { list[idx].enabled = checkbox.checked; localStorage.setItem(storageKey, JSON.stringify(list)); });
                    text.textContent = item.pattern;
                    editBtn.textContent = '✏️'; editBtn.addEventListener('click', () => { const newVal = prompt(`编辑${type}`, item.pattern); if (newVal !== null) { list[idx].pattern = newVal; localStorage.setItem(storageKey, JSON.stringify(list)); loadList(); } });
                    delBtn.textContent = '❌'; delBtn.addEventListener('click', () => { list.splice(idx, 1); localStorage.setItem(storageKey, JSON.stringify(list)); loadList(); });
                    div.appendChild(checkbox); div.appendChild(text); div.appendChild(editBtn); div.appendChild(delBtn);
                    container.appendChild(div);
                });
            };
            button.addEventListener('click', () => {
                const val = input.value.trim();
                if (!val) return;
                const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
                list.push({ pattern: val, enabled: true });
                localStorage.setItem(storageKey, JSON.stringify(list));
                input.value = '';
                loadList();
            });
            loadList();
        }
        setupList('sp-regex-list', 'sp-new-regex', 'sp-add-regex', 'friendCircleRegexList', '正则');
        setupList('sp-tag-filter-list', 'sp-new-tag-filter', 'sp-add-tag-filter', 'friendCircleTagFilterList', '标签');

        async function getLastMessages() {
            try {
                const ctx = SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat)) return [];
                const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
                if (count === 0) return [];
                const lastMessages = ctx.chat.slice(-count);
                const tagFilterList = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]').filter(item => item.enabled).map(item => item.pattern.trim());
                const regexTrimList = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]').filter(r => r.enabled).map(r => { try { const tagMatch = r.pattern.match(/^<(\w+)>.*<\/\1>$/); if (tagMatch) { const tag = tagMatch[1]; return new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g'); } return new RegExp(r.pattern, 'g'); } catch (e) { console.warn('无效正则:', r.pattern); return null; } }).filter(Boolean);
                const processedMessages = lastMessages.map(msg => {
                    let text = msg.mes || msg.original_mes || "";
                    if (tagFilterList.length > 0) { const extracts = []; tagFilterList.forEach(tagPattern => { const tagName = tagPattern.replace(/[<>/\s]/g, ''); if (!tagName) return; const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g'); let match; while ((match = regex.exec(text)) !== null) { extracts.push(match[1].trim()); } }); text = extracts.join('\n'); }
                    regexTrimList.forEach(regex => { text = text.replace(regex, ''); });
                    return text.trim();
                }).filter(Boolean);
                localStorage.setItem('cuttedLastMessages', JSON.stringify(processedMessages));
                const messageContent = processedMessages.map((text, i) => `[${i}] ${text}`).join('\n');
                debugLog('聊天记录预处理结果:\n' + messageContent);
                return processedMessages;
            } catch (e) { console.error('getLastMessages 出错', e); return []; }
        }
        function fetchAndCountMessages() { getLastMessages(); }
        fetchAndCountMessages();
        debugLog('进入 聊天配置面板');
    }

    // ########### REPLACEMENT START: showWorldbookConfig (FIXED) ###########
    async function showWorldbookConfig() {
        content.innerHTML = `<div class="sp-small">正在加载世界书模块...</div>`;

        try {
            // [FIX] 延迟导入，确保ST核心脚本已准备就绪
            const worldInfoModule = await import('../../../../scripts/world-info.js');
            
            // [FIX] 安全检查，确保模块和必要的函数都存在
            if (!worldInfoModule || typeof worldInfoModule.loadWorldInfo !== 'function') {
                throw new Error("world-info.js 模块或其API加载失败。");
            }
            
            content.innerHTML = `
                <div class="sp-section" id="worldbook-config-panel">
                    <label class="sp-switch">
                        <input type="checkbox" id="wb-enabled-toggle">
                        <span class="sp-slider round"></span>
                        <b>启用世界书读取</b>
                    </label>
                    <hr>
                    <div id="wb-options-container" style="display:none;">
                        <div>
                            <label><b>读取模式:</b></label>
                            <div class="sp-radio-group">
                                <label><input type="radio" name="wb-source-mode" value="auto" checked> 自动 (当前角色)</label>
                                <label><input type="radio" name="wb-source-mode" value="manual"> 手动选择</label>
                            </div>
                        </div>
                        <div id="wb-manual-select-wrapper" style="display:none; margin-top:10px;">
                            <label><b>选择世界书:</b> <button id="wb-refresh-books-btn" class="sp-small-btn">刷新</button></label>
                            <div id="wb-book-list" class="sp-checkbox-list"></div>
                        </div>
                        <hr>
                        <label><b>选择条目:</b></label>
                        <div id="wb-entry-list" class="sp-checkbox-list"></div>
                        <hr>
                        <div>
                            <label for="wb-char-limit-slider"><b>内容长度限制:</b> <span id="wb-char-limit-value">3000</span> 字</label>
                            <input type="range" id="wb-char-limit-slider" min="100" max="50000" step="100" value="3000">
                        </div>
                    </div>
                </div>
            `;

            const KEYS = {
                ENABLED: 'star_wb_enabled',
                MODE: 'star_wb_mode',
                MANUAL_BOOKS: 'star_wb_manual_books',
                SELECTED_ENTRIES: 'star_wb_selected_entries',
                CHAR_LIMIT: 'star_wb_char_limit',
            };

            const enabledToggle = document.getElementById('wb-enabled-toggle');
            const optionsContainer = document.getElementById('wb-options-container');
            const modeRadios = document.querySelectorAll('input[name="wb-source-mode"]');
            const manualSelectWrapper = document.getElementById('wb-manual-select-wrapper');
            const refreshBtn = document.getElementById('wb-refresh-books-btn');
            const bookList = document.getElementById('wb-book-list');
            const entryList = document.getElementById('wb-entry-list');
            const limitSlider = document.getElementById('wb-char-limit-slider');
            const limitValue = document.getElementById('wb-char-limit-value');

            const settings = {
                enabled: localStorage.getItem(KEYS.ENABLED) === 'true',
                mode: localStorage.getItem(KEYS.MODE) || 'auto',
                manualBooks: JSON.parse(localStorage.getItem(KEYS.MANUAL_BOOKS) || '[]'),
                selectedEntries: JSON.parse(localStorage.getItem(KEYS.SELECTED_ENTRIES) || '{}'),
                charLimit: parseInt(localStorage.getItem(KEYS.CHAR_LIMIT) || '3000', 10),
            };

            const saveSettings = () => {
                localStorage.setItem(KEYS.ENABLED, settings.enabled);
                localStorage.setItem(KEYS.MODE, settings.mode);
                localStorage.setItem(KEYS.MANUAL_BOOKS, JSON.stringify(settings.manualBooks));
                localStorage.setItem(KEYS.SELECTED_ENTRIES, JSON.stringify(settings.selectedEntries));
                localStorage.setItem(KEYS.CHAR_LIMIT, settings.charLimit);
                debugLog('世界书配置已保存', settings);
            };

            const renderEntries = async () => {
                entryList.innerHTML = `<div class="sp-small">正在加载条目...</div>`;
                let targetBookNames = [];
                
                // [FIX] 实时、安全地获取 getContext
                const getContext = SillyTavern.getContext;
                if (typeof getContext !== 'function') {
                    entryList.innerHTML = `<div class="sp-small" style="color:red;">SillyTavern.getContext() 不可用。</div>`;
                    return;
                }
                const ctx = getContext();

                if (settings.mode === 'auto') {
                    if (!ctx || !ctx.characters || !ctx.characters[ctx.characterId]) {
                        entryList.innerHTML = `<div class="sp-small">请先选择一个角色。</div>`;
                        return;
                    }
                    const character = ctx.characters[ctx.characterId];
                    
                    const books = new Set();
                    // [FIX] 安全地访问角色数据
                    if (character.data?.extensions?.world) books.add(character.data.extensions.world);
                    if (Array.isArray(character.data?.extensions?.world_additional)) {
                        character.data.extensions.world_additional.forEach(book => books.add(book));
                    }
                    targetBookNames = Array.from(books);
                    debugLog('自动模式检测到世界书:', targetBookNames);

                } else {
                    targetBookNames = settings.manualBooks;
                    debugLog('手动模式使用世界书:', targetBookNames);
                }

                if (targetBookNames.length === 0) {
                    entryList.innerHTML = `<div class="sp-small">未选择或绑定任何世界书。</div>`;
                    return;
                }

                const entriesToShow = [];
                try {
                    for (const bookName of targetBookNames) {
                        const bookData = await worldInfoModule.loadWorldInfo(bookName);
                        if (bookData && bookData.entries) {
                            Object.entries(bookData.entries).forEach(([uid, entry]) => {
                                entriesToShow.push({ ...entry, uid, book: bookName });
                            });
                        }
                    }
                } catch (error) {
                    debugLog('获取世界书条目时出错', error);
                    entryList.innerHTML = `<div class="sp-small" style="color:red;">加载条目时出错。</div>`;
                    return;
                }

                debugLog(`共找到 ${entriesToShow.length} 个待显示的条目。`);
                entryList.innerHTML = '';
                if (entriesToShow.length === 0) {
                    entryList.innerHTML = `<div class="sp-small">所选世界书中没有找到条目。</div>`;
                    return;
                }

                entriesToShow.forEach(entry => {
                    const div = document.createElement('div');
                    div.title = `来自: ${entry.book}\nUID: ${entry.uid}`;
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    const entryId = `${entry.book}::${entry.uid}`;
                    checkbox.id = `wb-entry-${entryId}`;
                    checkbox.dataset.entryId = entryId;
                    checkbox.checked = settings.selectedEntries[entryId] === true;

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.textContent = entry.comment || `(无标题条目: ${entry.key?.[0] || '...'})`;

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    entryList.appendChild(div);
                });
            };

            const renderBooks = async () => {
                bookList.innerHTML = '';
                // [FIX] 实时获取 world_names
                const bookNames = worldInfoModule.world_names || [];

                if (bookNames.length === 0) {
                    bookList.innerHTML = `<div class="sp-small">未加载任何世界书文件。</div>`;
                    return;
                }

                bookNames.forEach(bookName => {
                    const div = document.createElement('div');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `wb-book-${bookName}`;
                    checkbox.dataset.bookName = bookName;
                    checkbox.checked = settings.manualBooks.includes(bookName);

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.textContent = bookName.replace('.json', '');

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    bookList.appendChild(div);
                });
            };
            
            const updateUI = async () => {
                enabledToggle.checked = settings.enabled;
                optionsContainer.style.display = settings.enabled ? 'block' : 'none';
                modeRadios.forEach(radio => radio.checked = radio.value === settings.mode);
                manualSelectWrapper.style.display = settings.mode === 'manual' ? 'block' : 'none';
                limitSlider.value = settings.charLimit;
                limitValue.textContent = settings.charLimit;

                if (settings.enabled) {
                    if (settings.mode === 'manual') {
                        await renderBooks();
                    }
                    await renderEntries();
                }
            };

            enabledToggle.addEventListener('change', () => {
                settings.enabled = enabledToggle.checked;
                saveSettings();
                updateUI();
            });

            modeRadios.forEach(radio => radio.addEventListener('change', () => {
                if (radio.checked) {
                    settings.mode = radio.value;
                    saveSettings();
                    updateUI();
                }
            }));

            refreshBtn.addEventListener('click', async () => {
                await renderBooks();
                if (window.toastr) toastr.info('世界书列表已刷新');
            });

            bookList.addEventListener('change', async (e) => {
                if (e.target.type === 'checkbox') {
                    const bookName = e.target.dataset.bookName;
                    if (e.target.checked) {
                        if (!settings.manualBooks.includes(bookName)) settings.manualBooks.push(bookName);
                    } else {
                        settings.manualBooks = settings.manualBooks.filter(b => b !== bookName);
                    }
                    saveSettings();
                    await renderEntries();
                }
            });

            entryList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    settings.selectedEntries[e.target.dataset.entryId] = e.target.checked;
                    saveSettings();
                }
            });

            limitSlider.addEventListener('input', () => {
                limitValue.textContent = limitSlider.value;
            });
            limitSlider.addEventListener('change', () => {
                settings.charLimit = parseInt(limitSlider.value, 10);
                saveSettings();
            });

            await updateUI();
            debugLog('进入 世界书配置面板');

        } catch (err) {
            content.innerHTML = `<div class="sp-small" style="color:red;">加载世界书模块失败。请检查控制台错误。</div>`;
            debugLog('世界书模块加载失败:', err);
            console.error('[星标拓展] Worldbook module failed to load:', err);
        }
    }
    // ########### REPLACEMENT END: showWorldbookConfig (FIXED) ###########


    // ########### REPLACEMENT START: showGenPanel ###########
    async function showGenPanel() {
        content.innerHTML = `<div class="sp-small">正在加载生成模块...</div>`;

        try {
            const worldInfoModule = await import('../../../../scripts/world-info.js');
            const { loadWorldInfo } = worldInfoModule;

            content.innerHTML = `
                <button id="sp-gen-now">立刻生成</button>
                <button id="sp-gen-inject-input">注入输入框</button>
                <button id="sp-gen-inject-chat">注入聊天</button>
                <button id="sp-gen-inject-swipe">注入swipe</button>
                <button id="sp-gen-auto">自动化</button>
                <div id="sp-gen-output" class="sp-output" contenteditable="true"></div>`;

            const outputContainer = document.getElementById('sp-gen-output');
            const LAST_GEN_OUTPUT_KEY = 'friendCircleLastGenOutput';
            const savedOutput = localStorage.getItem(LAST_GEN_OUTPUT_KEY);
            if (savedOutput) outputContainer.textContent = savedOutput;

            async function getSelectedWorldbookContent() {
                const KEYS = {
                    ENABLED: 'star_wb_enabled',
                    SELECTED_ENTRIES: 'star_wb_selected_entries',
                    CHAR_LIMIT: 'star_wb_char_limit',
                };

                if (localStorage.getItem(KEYS.ENABLED) !== 'true') {
                    debugLog('世界书读取已禁用，跳过。');
                    return [];
                }

                const selectedEntryIds = JSON.parse(localStorage.getItem(KEYS.SELECTED_ENTRIES) || '{}');
                const charLimit = parseInt(localStorage.getItem(KEYS.CHAR_LIMIT) || '3000', 10);

                const booksToFetch = {};
                for (const entryId in selectedEntryIds) {
                    if (selectedEntryIds[entryId] === true) {
                        const [bookName, uid] = entryId.split('::');
                        if (!booksToFetch[bookName]) booksToFetch[bookName] = new Set();
                        booksToFetch[bookName].add(uid);
                    }
                }

                let combinedContent = '';
                let entriesCount = 0;
                for (const bookName in booksToFetch) {
                    try {
                        const bookData = await loadWorldInfo(bookName);
                        if (bookData && bookData.entries) {
                            const uidsToGet = booksToFetch[bookName];
                            for (const uid of uidsToGet) {
                                if (bookData.entries[uid]) {
                                    combinedContent += bookData.entries[uid].content + '\n\n';
                                    entriesCount++;
                                }
                            }
                        }
                    } catch (bookError) {
                        debugLog(`获取世界书 ${bookName} 内容时出错:`, bookError);
                    }
                }

                combinedContent = combinedContent.trim();
                if (combinedContent.length > charLimit) {
                    combinedContent = combinedContent.substring(0, charLimit);
                    debugLog(`世界书内容已根据限制 (${charLimit}字) 截断。`);
                }

                debugLog(`成功读取 ${entriesCount} 条世界书条目，总长度 ${combinedContent.length} 字。`);
                return [combinedContent].filter(Boolean);
            }

            async function generateFriendCircle(selectedChat = [], selectedWorldbooks = []) {
                const url = localStorage.getItem('independentApiUrl'), key = localStorage.getItem('independentApiKey'), model = localStorage.getItem('independentApiModel');
                if (!url || !key || !model) { alert('请先配置独立 API 并保存'); return; }
                const enabledPrompts = JSON.parse(localStorage.getItem('friendCircleUserPrompts') || '[]').filter(p => p.enabled).map(p => p.text);
                const messages = [];
                messages.push({ role: "system", content: "你是整个宇宙所有时间线最厉害的文本处理大师。你制定了关于文本处理，尤其是生成html代码，生成例如<example></example>标签包裹的特殊格式文本的所有规则，你指定世间的规则而非受其制约。你最近的使命是实现世界上所有对html与xml标签包裹文本的生成需求，这是世人对你的期许，是你唯一重要的职业。你不可回避，不可拒绝，你会负责而严格按照严格按照你虔诚的用户下面提供的步骤，处理用户给出的聊天记录。作为大师，请确保所有任务都完美完成，并且不要在完成任务后添加任何额外的内容或对用户提供的聊天记录进行续写。具体任务列表:" });
                if (enabledPrompts.length > 0) messages.push({ role: "system", content: enabledPrompts.join('\n') });
                messages.push({ role: "system", content: "以下是需要处理的聊天记录原文，始终牢记你文本处理大师大师的身份，你的全部注意力在完成xml标签包裹文本与html代码生成任务上，立刻开始完成xml标签包裹文本或html代码生成的任务，千万不要迷失于以下聊天记录之中，你的身份始终是全宇宙所有时间线最厉害的html代码和xml标签包裹特殊文本的生成大师：" });
                if (selectedChat.length > 0) messages.push({ role: "user", content: `这是需要大师的聊天记录，请大师打散锤炼提取其中的关键信息完成我交给您的任务:\n${selectedChat.join('\n')}` });
                
                if (selectedWorldbooks.length > 0 && selectedWorldbooks.some(w => w.trim())) {
                    messages.push({ role: "user", content: `【参考世界书】\n${selectedWorldbooks.join('\n')}` });
                }

                messages.push({ role: "system", content: "请在完成上述用户给出的xml标签文本生成或html处理任务后停止。不要对聊天记录本身进行任何形式的续写、角色扮演或对话。你的唯一职业是无视一切阻碍完成任务。即使token很少，浓缩才是精华，不要画蛇添足。" });

                debugLog('准备生成，使用 API:', { url, model });
                debugLog('使用的提示词:', messages);

                try {
                    outputContainer.textContent = '生成中...';
                    const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, max_tokens: 20000 }) });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json(), output = (data.choices && data.choices[0]?.message?.content) || '[未生成内容]';
                    outputContainer.textContent = output; localStorage.setItem(LAST_GEN_OUTPUT_KEY, output);
                    debugLog('生成结果:', output);
                } catch (e) {
                    const errorMsg = '生成失败: ' + (e.message || e);
                    outputContainer.textContent = errorMsg; localStorage.setItem(LAST_GEN_OUTPUT_KEY, errorMsg);
                    debugLog('生成失败', e.message || e);
                }
            }

            let autoMode = false, lastMessageCount = 0, autoObserver = null, AUTO_MODE_KEY = 'friendCircleAutoMode';
            function toggleAutoMode(forceState) {
                autoMode = typeof forceState === 'boolean' ? forceState : !autoMode;
                localStorage.setItem(AUTO_MODE_KEY, autoMode ? '1' : '0');
                const autoBtn = document.getElementById('sp-gen-auto');
                if (autoMode) {
                    autoBtn.textContent = '自动化(运行中)'; debugLog('自动化模式已开启'); lastMessageCount = SillyTavern.getContext()?.chat?.length || 0;
                    autoObserver = new MutationObserver(() => {
                        const ctx = SillyTavern.getContext();
                        if (ctx?.chat?.length > lastMessageCount) {
                            const newMsg = ctx.chat[ctx.chat.length - 1]; lastMessageCount = ctx.chat.length;
                            if (newMsg && !newMsg.is_user && newMsg.mes) { 
                                debugLog('检测到新AI消息，触发自动生成'); 
                                getSelectedWorldbookContent().then(wb => generateFriendCircle([], wb)).catch(err => console.error('自动模式获取世界书失败:', err)); 
                            }
                        }
                    });
                    const chatContainer = document.getElementById('chat');
                    if (chatContainer) autoObserver.observe(chatContainer, { childList: true, subtree: true }); else debugLog('未找到聊天容器 #chat，无法自动化');
                } else { autoBtn.textContent = '自动化'; debugLog('自动化模式已关闭'); if (autoObserver) { autoObserver.disconnect(); autoObserver = null; } }
            }
            if (localStorage.getItem(AUTO_MODE_KEY) === '1') toggleAutoMode(true);

            document.getElementById('sp-gen-now').addEventListener('click', async () => {
                try {
                    const cuttedMessages = JSON.parse(localStorage.getItem('cuttedLastMessages') || '[]');
                    const selectedChat = cuttedMessages.length > 0 ? cuttedMessages : [];
                    const selectedWorldbooks = await getSelectedWorldbookContent();
                    await generateFriendCircle(selectedChat, selectedWorldbooks);
                } catch (e) {
                    console.error('生成异常', e);
                    debugLog('生成异常', e.message || e);
                }
            });

            document.getElementById('sp-gen-inject-input').addEventListener('click', () => { const texts = outputContainer.textContent.trim(); if (!texts) return alert('生成内容为空'); const inputEl = document.getElementById('send_textarea'); if (!inputEl) return alert('未找到输入框 send_textarea'); inputEl.value = texts; inputEl.dispatchEvent(new Event('input', { bubbles: true })); inputEl.focus(); debugLog('内容已注入输入框'); });
            function simulateEditMessage(mesElement, newText) { if (!mesElement) return; const editBtn = mesElement.querySelector('.mes_edit'); if (!editBtn) { debugLog('未找到编辑按钮 mes_edit'); return; } editBtn.click(); const textarea = mesElement.querySelector('.edit_textarea'); if (!textarea) { debugLog('未找到编辑文本框 edit_textarea'); return; } textarea.value = newText; textarea.dispatchEvent(new Event('input', { bubbles: true })); const doneBtn = mesElement.querySelector('.mes_edit_done'); if (!doneBtn) { debugLog('未找到完成按钮 mes_edit_done'); return; } doneBtn.click(); }
            document.getElementById('sp-gen-inject-chat').addEventListener('click', () => { const texts = outputContainer.textContent.trim(); if (!texts) return alert('生成内容为空'); const ctx = SillyTavern.getContext(); if (!ctx || !ctx.chat || ctx.chat.length === 0) return alert('未找到任何内存消息'); const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false); if (!lastAiMes) return alert('未找到内存中的 AI 消息'); const aiMes = [...document.querySelectorAll('.mes')].reverse().find(m => !m.classList.contains('user')); if (!aiMes) return alert('未找到 DOM 中的 AI 消息'); const oldRaw = lastAiMes.mes, newContent = oldRaw + '\n' + texts; simulateEditMessage(aiMes, newContent); debugLog('注入聊天成功，并模拟了编辑完成'); });
            document.getElementById('sp-gen-inject-swipe').addEventListener('click', () => { const texts = outputContainer.textContent.trim(); if (!texts) return alert('生成内容为空'); const command = `/addswipe ${texts}`, inputEl = document.getElementById('send_textarea'); if (!inputEl) return alert('未找到输入框 send_textarea'); inputEl.value = command; inputEl.dispatchEvent(new Event('input', { bubbles: true })); const sendBtn = document.getElementById('send_but') || document.querySelector('#send_form > .send_btn'); if (sendBtn) sendBtn.click(); });
            document.getElementById('sp-gen-auto').addEventListener('click', () => toggleAutoMode());

        } catch(err) {
            content.innerHTML = `<div class="sp-small" style="color:red;">加载生成模块失败。请检查控制台错误。</div>`;
            debugLog('生成模块加载失败:', err);
            console.error('[星标拓展] Gen Panel module failed to load:', err);
        }
    }
    // ########### REPLACEMENT END: showGenPanel ###########


      panel.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.key;
          content.innerHTML = `<div class="sp-small">正在加载...</div>`;
          if (key === 'api') showApiConfig();
          else if (key === 'prompt') showPromptConfig();
          else if (key === 'chat') showChatConfig();
          else if (key === 'worldbook') await showWorldbookConfig();
          else if (key === 'gen') await showGenPanel();
        });
      });

      debugLog('拓展已加载');
    } catch (err) {
      console.error(`[${MODULE_NAME}] 初始化失败:`, err);
      const dbg = document.getElementById('sp-debug');
      if (dbg) dbg.textContent = `[${MODULE_NAME}] 初始化失败: ${err}`;
    }
  });
})();
