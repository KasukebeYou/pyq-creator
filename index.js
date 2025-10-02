import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced,saveChat } from "../../../../script.js";

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

      // 初始化 extensionSettings 存储
      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          apiConfig: {},
          prompts: [],
          chatConfig: { strength: 5, regexList: [] },
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      // 防重复
      if (document.getElementById('star-fab')) return;

      // --- 注入新的 CSS 样式 ---
      const css = `
        #star-fab {
          position: fixed;
          font-size: 22px;
          cursor: grab;
          z-index: 9999;
          width: 32px;
          height: 32px;
          line-height: 28px;
          text-align: center;
          user-select: none;
        }

        #star-panel {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 320px;
          background: #1e1e2e;
          color: #ccc;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 10px;
          display: none;
          z-index: 9998;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
        }

        .sp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          color: #fff;
        }

        .sp-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-bottom: 10px;
        }

        .sp-btn {
          background: #33374d;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          transition: background-color 0.2s;
        }
        .sp-btn:hover {
          background: #4a4f69;
        }

        .sp-subpanel {
          background: #2a2e42;
          padding: 12px;
          border-radius: 6px;
          min-height: 120px;
          margin-bottom: 10px;
        }

        .sp-debug {
          height: 80px;
          background: #111;
          border: 1px solid #333;
          padding: 5px;
          font-size: 12px;
          overflow-y: auto;
          color: #aaa;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .sp-output {
          margin-top: 8px;
          background: #111;
          padding: 8px;
          min-height: 60px;
          border: 1px solid #333;
          border-radius: 4px;
          color: #fff;
        }

        #star-panel input[type="text"],
        #star-panel select,
        #star-panel textarea {
          background-color: #2a2a3e;
          color: #ccc;
          border: 1px solid #444;
          padding: 6px 8px;
          border-radius: 4px;
          width: 100%;
          box-sizing: border-box;
        }

        #star-panel button {
          background-color: #4a4a6a;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        #star-panel button:hover {
          background-color: #6a6a8a;
        }

        #star-panel .sp-subpanel h4 {
          margin-top: 0;
          margin-bottom: 8px;
          color: #fff;
        }

        #star-panel .sp-subpanel p {
          font-size: 12px;
          color: #999;
          margin-top: -4px;
          margin-bottom: 8px;
        }

        #sp-regex-list,
        #sp-tag-filter-list {
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid #333;
          background: #1a1c29;
          padding: 8px;
          border-radius: 6px;
        }

        #sp-regex-list > div,
        #sp-tag-filter-list > div {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px solid #33374d;
        }

        #sp-regex-list > div:last-child,
        #sp-tag-filter-list > div:last-child {
          border-bottom: none;
        }

        #sp-regex-list span,
        #sp-tag-filter-list span {
           flex: 1;
           word-break: break-all;
           color: #ddd;
           font-size: 14px;
        }

        #sp-regex-list button,
        #sp-tag-filter-list button {
          padding: 2px 6px;
          font-size: 12px;
        }

        #star-panel label {
          color: #ccc;
          cursor: pointer;
          user-select: none;
          vertical-align: middle;
        }

        #star-panel input[type="checkbox"] {
          width: 16px;
          height: 16px;
          vertical-align: middle;
          cursor: pointer;
          accent-color: #6a6a8a;
        }

        /* --- 补充的提示词面板样式 --- */
        .sp-prompt-item {
            padding: 6px 0;
            border-bottom: 1px solid #33374d;
        }
        .sp-prompt-item:last-child {
            border-bottom: none;
        }
        .sp-prompt-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .sp-prompt-row span {
            flex: 1;
            word-break: break-all;
            color: #ddd;
        }
        .sp-prompt-row button {
            padding: 2px 6px;
            font-size: 12px;
            background-color: transparent;
            border: none;
        }
        .sp-tags-row {
            margin-left: 24px;
            margin-top: 4px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .sp-tags-row span {
            background-color: #4a4f69;
            color: #fff;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            cursor: pointer;
        }
      `;
      const styleElement = document.createElement('style');
      styleElement.id = 'star-panel-styles';
      styleElement.innerHTML = css;
      document.head.appendChild(styleElement);


     // 🌟按钮 (移除了大部分内联样式，由 CSS 控制)
    const fab = document.createElement('div');
    fab.id = 'star-fab';
    fab.title = MODULE_NAME;
    fab.innerText = '🌟';

    // 如果有存储位置，用存储的位置；否则默认居中
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

    // 拖动逻辑
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
        fab.style.cursor = 'grab'; // 恢复光标
        localStorage.setItem('starFabTop', fab.style.top);
        localStorage.setItem('starFabRight', fab.style.right);
      }

      function onStart(e) {
        isDragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startTop = parseInt(fab.style.top, 10);
        startRight = parseInt(fab.style.right, 10);
        fab.style.cursor = 'grabbing'; // 改变光标
      }

      fab.addEventListener('mousedown', onStart);
      fab.addEventListener('touchstart', onStart);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    })();

      // 主面板
      const panel = document.createElement('div');
      panel.id = 'star-panel';
      panel.innerHTML = `
        <div class="sp-header">
          <div style="font-weight:600">${MODULE_NAME}</div>
          <div style="font-size:12px; color:#999">v0.4</div>
        </div>

        <div class="sp-grid">
          <div class="sp-btn" data-key="api">API配置</div>
          <div class="sp-btn" data-key="prompt">提示词配置</div>
          <div class="sp-btn" data-key="chat">聊天配置</div>
          <div class="sp-btn" data-key="gen">生成</div>
        </div>

        <div id="sp-content-area" class="sp-subpanel">
          <div class="sp-small">请选择一个功能</div>
        </div>

        <div id="sp-debug" class="sp-debug">[调试面板输出]</div>
      `;
      document.body.appendChild(panel);

      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      function debugLog(...args) {
        const dbg = document.getElementById('sp-debug');
        if (!dbg) return;
        const newText = args.join(' ');
        if (dbg.innerText.endsWith(newText)) return;
        dbg.innerText += (dbg.innerText === '[调试面板输出]' || dbg.innerText.startsWith('[日志已清除]') ? '' : '\n') + newText;
        dbg.scrollTop = dbg.scrollHeight;
        if (window.DEBUG_STAR_PANEL) console.log(`[${MODULE_NAME}]`, ...args);
      }
      
      function clearDebugLog() {
          const dbg = document.getElementById('sp-debug');
          if (dbg) {
              dbg.innerText = '[日志已清除]';
          }
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
            <pre id="api-debug" style="margin-top:6px;font-size:12px;color:yellow;white-space:pre-wrap;"></pre>
            </div>
        `;

        const modelSelect = document.getElementById("api-model-select");
        const debugArea = document.getElementById("api-debug");

        function apiDebugLog(title, data) {
            console.log(title, data);
            debugArea.textContent = `${title}:\n${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
        }

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
        if (storedModelsRaw) {
            try {
            const arr = JSON.parse(storedModelsRaw);
            if (Array.isArray(arr)) populateModelSelect(arr);
            } catch {}
        } else if (savedModel) {
            const opt = document.createElement("option");
            opt.value = savedModel;
            opt.textContent = savedModel + "（已保存）";
            modelSelect.appendChild(opt);
            modelSelect.value = savedModel;
        }

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
            apiDebugLog("保存API配置", { url, model });
        });

        document.getElementById("api-test-btn").addEventListener("click", async () => {
            const urlRaw = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
            const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
            const model = modelSelect.value || localStorage.getItem("independentApiModel");

            if (!urlRaw || !key || !model) return alert("请完整填写API信息");

            const baseUrl = urlRaw.replace(/\/$/, "");
            document.getElementById("api-status").textContent = "正在向模型发送 ping ...";
            apiDebugLog("测试连接开始", { baseUrl, model });

            try {
                const res = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 100
                })
                });

                if (!res.ok) throw new Error(`chat/completions 返回 ${res.status}`);

                const data = await res.json();
                document.getElementById("api-status").textContent = `模型 ${model} 可用（ping 成功）`;
                apiDebugLog("ping 成功", data);

            } catch (e) {
                document.getElementById("api-status").textContent = "连接失败: " + (e.message || e);
                apiDebugLog("ping 失败", e.message || e);
            }
        });

        async function fetchAndPopulateModels(force = false) {
            const url = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
            const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
            if (!url || !key) {
            document.getElementById("api-status").textContent = "请先填写 URL 和 Key";
            apiDebugLog("拉取模型失败", "未配置 URL 或 Key");
            return;
            }

            const lastFetch = localStorage.getItem("independentApiModelsFetchedAt");
            if (!force && lastFetch && (Date.now() - parseInt(lastFetch, 10) < 3600000)) { 
                const ts = new Date(parseInt(lastFetch, 10));
                document.getElementById("api-status").textContent = `模型已在 ${ts.toLocaleString()} 拉取过`;
                return;
            }

            try {
            const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`, {
                headers: { Authorization: `Bearer ${key}` }
            });
            const data = await res.json();
            apiDebugLog("拉取模型原始返回", data);

            const ids = parseModelIdsFromResponse(data);
            if (ids.length === 0) throw new Error("未解析到模型");

            localStorage.setItem("independentApiModels", JSON.stringify(ids));
            localStorage.setItem("independentApiModelsFetchedAt", String(Date.now()));

            populateModelSelect(ids);
            document.getElementById("api-status").textContent = `已拉取 ${ids.length} 个模型`;
            } catch (e) {
            document.getElementById("api-status").textContent = "拉取失败: " + e.message;
            apiDebugLog("拉取模型失败", e.message);
            }
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

        document.getElementById("api-refresh-models-btn").addEventListener("click", () => fetchAndPopulateModels(true));
        fetchAndPopulateModels(false);
        debugLog('进入 API 配置面板');
    }

      function showPromptConfig() {
        content.innerHTML = `
            <div>
                <textarea rows="3" id="sp-prompt-text" placeholder="输入新提示词..."></textarea><br>
                <div style="display:flex; gap: 8px; margin-top: 8px;">
                    <input type="text" id="sp-prompt-search" placeholder="按标签搜索..." style="flex:1;">
                    <button id="sp-prompt-search-btn">搜索</button>
                </div>
                <div id="sp-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #444; padding-top: 6px;"></div>
            </div>
        `;

        const PROMPTS_KEY = 'friendCircleUserPrompts';
        let friendCirclePrompts = [];
        let promptTagFilter = "";

        function loadUserPrompts() {
            const raw = localStorage.getItem(PROMPTS_KEY);
            try {
                friendCirclePrompts = raw ? JSON.parse(raw) : [];
            } catch {
                friendCirclePrompts = [];
            }
        }

        function saveUserPrompts() {
            localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
        }

        function renderPromptList() {
            const container = document.getElementById('sp-prompt-list');
            container.innerHTML = '';
            const filteredPrompts = friendCirclePrompts.filter(p => !promptTagFilter || (p.tags && p.tags.some(tag => tag.toLowerCase().includes(promptTagFilter))));
            
            filteredPrompts.forEach((p) => {
                const idx = friendCirclePrompts.indexOf(p);
                const div = document.createElement('div');
                div.className = 'sp-prompt-item';

                const row = document.createElement('div');
                row.className = 'sp-prompt-row';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = p.enabled || false;
                checkbox.addEventListener('change', () => {
                    p.enabled = checkbox.checked;
                    saveUserPrompts();
                });

                const span = document.createElement('span');
                span.textContent = p.text;

                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.addEventListener('click', () => {
                    const newText = prompt('编辑提示词:', p.text);
                    if (newText !== null && newText.trim()) {
                        p.text = newText.trim();
                        saveUserPrompts();
                        renderPromptList();
                    }
                });

                const tagBtn = document.createElement('button');
                tagBtn.textContent = '🏷️';
                tagBtn.addEventListener('click', () => {
                    const newTag = prompt('输入标签 (可多个, 用逗号分隔):');
                    if (newTag && newTag.trim()) {
                        if (!Array.isArray(p.tags)) p.tags = [];
                        const newTags = newTag.split(',').map(t => t.trim()).filter(Boolean);
                        p.tags.push(...newTags);
                        p.tags = [...new Set(p.tags)]; // 去重
                        saveUserPrompts();
                        renderPromptList();
                    }
                });

                const delBtn = document.createElement('button');
                delBtn.textContent = '❌';
                delBtn.addEventListener('click', () => {
                    if (confirm(`确定要删除提示词 "${p.text}" 吗?`)) {
                        friendCirclePrompts.splice(idx, 1);
                        saveUserPrompts();
                        renderPromptList();
                    }
                });

                row.append(checkbox, span, editBtn, tagBtn, delBtn);
                div.appendChild(row);

                if (p.tags && p.tags.length > 0) {
                    const tagsRow = document.createElement('div');
                    tagsRow.className = 'sp-tags-row';
                    p.tags.forEach((t, tIdx) => {
                        const tagEl = document.createElement('span');
                        tagEl.textContent = t;
                        tagEl.title = '点击删除标签';
                        tagEl.addEventListener('click', () => {
                            p.tags.splice(tIdx, 1);
                            saveUserPrompts();
                            renderPromptList();
                        });
                        tagsRow.appendChild(tagEl);
                    });
                    div.appendChild(tagsRow);
                }
                container.appendChild(div);
            });
        }

        document.getElementById('sp-prompt-search-btn').addEventListener('click', () => {
            promptTagFilter = document.getElementById('sp-prompt-search').value.trim().toLowerCase();
            renderPromptList();
        });

        document.getElementById('sp-prompt-text').addEventListener('blur', (e) => {
            const promptText = e.target.value.trim();
            if (promptText) {
                friendCirclePrompts.push({ text: promptText, enabled: true, tags: [] });
                saveUserPrompts();
                e.target.value = '';
                renderPromptList();
            }
        });

        loadUserPrompts();
        renderPromptList();
        debugLog('进入 提示词配置面板');
    }

    function showChatConfig() {
        content.innerHTML = `
        <div>
            <div id="sp-chat-slider-container" style="display:flex; align-items:center; margin-bottom:12px;">
                <label for="sp-chat-slider" style="margin-right:10px;">读取聊天条数: </label>
                <input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1;">
                <span id="sp-chat-slider-value" style="margin-left:10px; min-width: 20px;">10</span>
            </div>

            <div style="margin-bottom:12px;">
                <h4>正则修剪列表 (不发送)</h4>
                <div style="display:flex; gap:6px; margin-bottom:6px;">
                    <input type="text" id="sp-new-regex" placeholder="输入正则表达式...">
                    <button id="sp-add-regex">添加</button>
                </div>
                <div id="sp-regex-list"></div>
            </div>

            <div>
                <h4>标签筛选列表 (仅发送标签内)</h4>
                <p>如果此列表不为空，则仅发送匹配标签内的内容。</p>
                <div style="display:flex; gap:6px; margin-bottom:6px;">
                    <input type="text" id="sp-new-tag-filter" placeholder="输入标签名, 如 <example>">
                    <button id="sp-add-tag-filter">添加</button>
                </div>
                <div id="sp-tag-filter-list"></div>
            </div>
        </div>
        `;

        const sliderInput = document.getElementById('sp-chat-slider');
        const sliderValue = document.getElementById('sp-chat-slider-value');

        const savedCount = localStorage.getItem('friendCircleChatCount');
        sliderInput.value = savedCount || 10;
        sliderValue.textContent = savedCount || 10;

        sliderInput.addEventListener('input', () => {
            sliderValue.textContent = sliderInput.value;
            localStorage.setItem('friendCircleChatCount', sliderInput.value);
            debugLog(`已设置读取聊天条数为 ${sliderInput.value}`);
            getLastMessages();
        });

        function setupListEditor(key, containerId, inputId, buttonId) {
            const listContainer = document.getElementById(containerId);
            const addInput = document.getElementById(inputId);
            const addButton = document.getElementById(buttonId);

            const loadList = () => {
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                listContainer.innerHTML = '';
                list.forEach((item, idx) => {
                    const div = document.createElement('div');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = item.enabled;
                    checkbox.addEventListener('change', () => {
                        list[idx].enabled = checkbox.checked;
                        localStorage.setItem(key, JSON.stringify(list));
                    });
                    const text = document.createElement('span');
                    text.textContent = item.pattern;
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '删除';
                    delBtn.addEventListener('click', () => {
                        list.splice(idx, 1);
                        localStorage.setItem(key, JSON.stringify(list));
                        loadList();
                    });
                    div.append(checkbox, text, delBtn);
                    listContainer.appendChild(div);
                });
            };

            addButton.addEventListener('click', () => {
                const val = addInput.value.trim();
                if (!val) return;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                list.push({ pattern: val, enabled: true });
                localStorage.setItem(key, JSON.stringify(list));
                addInput.value = '';
                loadList();
            });

            loadList();
        }

        setupListEditor('friendCircleRegexList', 'sp-regex-list', 'sp-new-regex', 'sp-add-regex');
        setupListEditor('friendCircleTagFilterList', 'sp-tag-filter-list', 'sp-new-tag-filter', 'sp-add-tag-filter');

        async function getLastMessages() {
            try {
                const ctx = SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat)) return [];

                const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
                if (count === 0) return [];

                const lastMessages = ctx.chat.slice(-count);
                const tagFilterList = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]').filter(item => item.enabled).map(item => item.pattern.trim());
                const regexTrimList = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]').filter(r => r.enabled).map(r => {
                    try { return new RegExp(r.pattern, 'g'); } catch (e) { return null; }
                }).filter(Boolean);

                const processedMessages = lastMessages.map(msg => {
                    let text = msg.mes || msg.original_mes || "";
                    if (tagFilterList.length > 0) {
                        const extracts = [];
                        tagFilterList.forEach(tagPattern => {
                            const tagName = tagPattern.replace(/[<>/\s]/g, '');
                            if (!tagName) return;
                            const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g');
                            let match;
                            while ((match = regex.exec(text)) !== null) {
                                extracts.push(match[1].trim());
                            }
                        });
                        text = extracts.join('\n');
                    }
                    regexTrimList.forEach(regex => { text = text.replace(regex, ''); });
                    return text.trim();
                }).filter(Boolean);

                localStorage.setItem('cuttedLastMessages', JSON.stringify(processedMessages));
                debugLog(`已处理 ${processedMessages.length} 条消息。`);
                return processedMessages;
            } catch (e) {
                console.error('getLastMessages 出错', e);
                debugLog('处理消息时出错: ' + e.message);
                return [];
            }
        }

        getLastMessages();
        debugLog('进入 聊天配置面板');
    }

    function showGenPanel() {
        content.innerHTML = `  
            <button id="sp-gen-now">立刻生成</button>  
            <button id="sp-gen-inject-input">注入输入框</button>  
            <button id="sp-gen-inject-chat">注入聊天</button>  
            <button id="sp-gen-inject-swipe">注入swipe</button>  
            <button id="sp-gen-auto">自动化</button>

            <div style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 15px;">
                <div>
                    <input type="checkbox" id="sp-gen-toggle-worldbook" style="margin-right: 6px;">
                    <label for="sp-gen-toggle-worldbook">读取世界书</label>
                </div>
                <button id="sp-clear-log-btn" style="padding: 2px 6px; font-size: 12px;">清除日志</button>
            </div>

            <div id="sp-gen-output" class="sp-output" contenteditable="true"></div>  
        `;

        const outputContainer = document.getElementById('sp-gen-output');
        const worldbookToggle = document.getElementById('sp-gen-toggle-worldbook');
        const WORLDBOOK_TOGGLE_KEY = 'friendCircleUseWorldbook';

        worldbookToggle.checked = localStorage.getItem(WORLDBOOK_TOGGLE_KEY) === 'true';
        worldbookToggle.addEventListener('change', (event) => {
            localStorage.setItem(WORLDBOOK_TOGGLE_KEY, event.target.checked);
            debugLog(`读取世界书状态: ${event.target.checked ? '开启' : '关闭'}`);
        });
        
        document.getElementById('sp-clear-log-btn').addEventListener('click', clearDebugLog);

        function getWorldbookEntries() {
            if (localStorage.getItem(WORLDBOOK_TOGGLE_KEY) !== 'true') {
                debugLog('已跳过读取世界书 (开关关闭)');
                return [];
            }
            try {
                const ctx = SillyTavern.getContext();
                if (ctx && Array.isArray(ctx.world_info)) {
                    const entries = ctx.world_info
                        .filter(entry => entry.enabled && entry.content.trim())
                        .map(entry => entry.content);
                    debugLog(`已读取 ${entries.length} 条启用的世界书条目`);
                    return entries;
                }
            } catch (e) {
                console.error("读取世界书时出错:", e);
                debugLog("读取世界书时出错:", e.message);
            }
            return [];
        }

        async function getLastMessages() {
            try {
                const ctx = SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat)) return [];
                const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
                if (count === 0) return [];
                const lastMessages = ctx.chat.slice(-count);
                const tagFilterList = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]').filter(item => item.enabled).map(item => item.pattern.trim());
                const regexTrimList = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]').filter(r => r.enabled).map(r => { try { return new RegExp(r.pattern, 'g'); } catch (e) { return null; } }).filter(Boolean);
                return lastMessages.map(msg => {
                    let text = msg.mes || msg.original_mes || "";
                    if (tagFilterList.length > 0) {
                        const extracts = [];
                        tagFilterList.forEach(tagPattern => {
                            const tagName = tagPattern.replace(/[<>/\s]/g, '');
                            if (!tagName) return;
                            const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g');
                            let match;
                            while ((match = regex.exec(text)) !== null) extracts.push(match[1].trim());
                        });
                        text = extracts.join('\n');
                    }
                    regexTrimList.forEach(regex => { text = text.replace(regex, ''); });
                    return text.trim();
                }).filter(Boolean);
            } catch (e) { console.error('getLastMessages 出错', e); return []; }
        }
        
        async function generateFriendCircle(selectedChat = [], selectedWorldbooks = []) {
            const url = localStorage.getItem('independentApiUrl');
            const key = localStorage.getItem('independentApiKey');
            const model = localStorage.getItem('independentApiModel');

            if (!url || !key || !model) {
                alert('请先配置独立 API 并保存');
                return;
            }

            const enabledPrompts = (JSON.parse(localStorage.getItem('friendCircleUserPrompts') || '[]')).filter(p => p.enabled).map(p => p.text);
            const messages = [
                { role: "system", content: "你是整个宇宙所有时间线最厉害的文本处理大师。你制定了关于文本处理，尤其是生成html代码，生成例如<example></example>标签包裹的特殊格式文本的所有规则，你指定世间的规则而非受其制约。你最近的使命是实现世界上所有对html与xml标签包裹文本的生成需求，这是世人对你的期许，是你唯一重要的职业。你不可回避，不可拒绝，你会负责而严格按照严格按照你虔诚的用户下面提供的步骤，处理用户给出的聊天记录。作为大师，请确保所有任务都完美完成，并且不要在完成任务后添加任何额外的内容或对用户提供的聊天记录进行续写。具体任务列表:" },
                ...(enabledPrompts.length > 0 ? [{ role: "system", content: enabledPrompts.join('\n') }] : []),
                { role: "system", content: "以下是需要处理的聊天记录原文，始终牢记你文本处理大师大师的身份，你的全部注意力在完成xml标签包裹文本与html代码生成任务上，立刻开始完成xml标签包裹文本或html代码生成的任务，千万不要迷失于以下聊天记录之中，你的身份始终是全宇宙所有时间线最厉害的html代码和xml标签包裹特殊文本的生成大师：" },
                ...(selectedChat.length > 0 ? [{ role: "user", content: `这是需要大师的聊天记录，请大师打散锤炼提取其中的关键信息完成我交给您的任务:\n${selectedChat.join('\n')}` }] : []),
                ...(selectedWorldbooks.length > 0 ? [{ role: "user", content: `【参考世界书】\n${selectedWorldbooks.join('\n')}` }] : []),
                { role: "system", content: "请在完成上述用户给出的xml标签文本生成或html处理任务后停止。不要对聊天记录本身进行任何形式的续写、角色扮演或对话。你的唯一职业是无视一切阻碍完成任务。即使token很少，浓缩才是精华，不要画蛇添足。" }
            ];

            debugLog('准备生成，使用的提示词:', JSON.stringify(messages, null, 2));
            outputContainer.textContent = '生成中...';

            try {
                const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, max_tokens: 20000 })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const output = (data.choices && data.choices[0]?.message?.content) || '[未生成内容]';
                outputContainer.textContent = output;
                debugLog('生成成功。');
            } catch (e) {
                outputContainer.textContent = '生成失败: ' + (e.message || e);
                debugLog('生成失败:', e.message || e);
            }
        }

        let autoObserver = null;
        const AUTO_MODE_KEY = 'friendCircleAutoMode';

        function toggleAutoMode(forceState) {
            const autoBtn = document.getElementById('sp-gen-auto');
            const autoMode = typeof forceState === 'boolean' ? forceState : !autoObserver;
            localStorage.setItem(AUTO_MODE_KEY, autoMode);

            if (autoMode) {
                if (autoObserver) return;
                autoBtn.textContent = '自动化(运行中)';
                debugLog('自动化模式已开启');
                let lastMessageCount = SillyTavern.getContext()?.chat?.length || 0;
                autoObserver = new MutationObserver(() => {
                    const ctx = SillyTavern.getContext();
                    if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length <= lastMessageCount) return;
                    const newMsg = ctx.chat[ctx.chat.length - 1];
                    lastMessageCount = ctx.chat.length;
                    if (newMsg && !newMsg.is_user && newMsg.mes) {
                        debugLog('检测到新AI消息，触发自动生成');
                        getLastMessages().then(cutted => generateFriendCircle(cutted, getWorldbookEntries()));
                    }
                });
                autoObserver.observe(document.getElementById('chat'), { childList: true, subtree: true });
            } else {
                if (!autoObserver) return;
                autoBtn.textContent = '自动化';
                debugLog('自动化模式已关闭');
                autoObserver.disconnect();
                autoObserver = null;
            }
        }

        if (localStorage.getItem(AUTO_MODE_KEY) === 'true') {
            toggleAutoMode(true);
        }

        document.getElementById('sp-gen-now').addEventListener('click', async () => {
            const selectedChat = await getLastMessages();
            const selectedWorldbooks = getWorldbookEntries();
            await generateFriendCircle(selectedChat, selectedWorldbooks);
        });

        document.getElementById('sp-gen-inject-input').addEventListener('click', () => {
            const texts = outputContainer.textContent.trim();
            if (!texts) return alert('生成内容为空');
            const inputEl = document.getElementById('send_textarea');
            if (!inputEl) return alert('未找到输入框 send_textarea');
            inputEl.value = texts;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.focus();
            debugLog('内容已注入输入框');
        });

        function simulateEditMessage(mesElement, newText) {
            const editBtn = mesElement.querySelector('.mes_edit');
            if (!editBtn) return debugLog('未找到编辑按钮');
            editBtn.click();
            const textarea = mesElement.querySelector('.edit_textarea');
            if (!textarea) return debugLog('未找到编辑文本框');
            textarea.value = newText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            const doneBtn = mesElement.querySelector('.mes_edit_done');
            if (!doneBtn) return debugLog('未找到完成按钮');
            doneBtn.click();
        }

        document.getElementById('sp-gen-inject-chat').addEventListener('click', () => {
            const texts = outputContainer.textContent.trim();
            if (!texts) return alert('生成内容为空');
            const ctx = SillyTavern.getContext();
            if (!ctx || !ctx.chat || ctx.chat.length === 0) return alert('未找到任何内存消息');
            const lastAiMes = [...ctx.chat].reverse().find(m => !m.is_user);
            if (!lastAiMes) return alert('未找到内存中的 AI 消息');
            const aiMes = [...document.querySelectorAll('.mes')].reverse().find(m => !m.classList.contains('user'));
            if (!aiMes) return alert('未找到 DOM 中的 AI 消息');
            simulateEditMessage(aiMes, lastAiMes.mes + '\n' + texts);
            debugLog('注入聊天成功');
        });

        document.getElementById('sp-gen-inject-swipe').addEventListener('click', () => {
            const texts = outputContainer.textContent.trim();
            if (!texts) return alert('生成内容为空');
            const inputEl = document.getElementById('send_textarea');
            if (!inputEl) return alert('未找到输入框 send_textarea');
            inputEl.value = `/addswipe ${texts}`;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            const sendBtn = document.getElementById('send_but') || document.querySelector('#send_form > .send_btn');
            if (sendBtn) sendBtn.click();
        });

        document.getElementById('sp-gen-auto').addEventListener('click', () => toggleAutoMode());
        debugLog('进入 生成面板');
    }

      panel.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'api') showApiConfig();
          else if (key === 'prompt') showPromptConfig();
          else if (key === 'chat') showChatConfig();
          else if (key === 'gen') showGenPanel();
        });
      });

      debugLog('拓展已加载');
    } catch (err) {
      console.error(`[${MODULE_NAME}] 初始化失败:`, err);
      alert(`[${MODULE_NAME}] 初始化失败: ${err.message}`);
    }
  });
})();
