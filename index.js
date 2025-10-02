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

     // 🌟按钮
const fab = document.createElement('div');
fab.id = 'star-fab';
fab.title = MODULE_NAME;
fab.innerText = '🌟';
fab.style.position = 'fixed';

// 如果有存储位置，用存储的位置；否则默认居中
const savedTop = localStorage.getItem('starFabTop');
const savedRight = localStorage.getItem('starFabRight');
if (savedTop && savedRight) {
  fab.style.top = savedTop;
  fab.style.right = savedRight;
} else {
  const centerTop = (window.innerHeight / 2 - 16) + 'px';   // 32px按钮高度/2=16
  const centerRight = (window.innerWidth / 2 - 16) + 'px';  // 32px按钮宽度/2=16
  fab.style.top = centerTop;
  fab.style.right = centerRight;
}

fab.style.zIndex = '9999';
fab.style.cursor = 'grab';
fab.style.userSelect = 'none';
fab.style.fontSize = '22px';
fab.style.lineHeight = '28px';
fab.style.width = '32px';
fab.style.height = '32px';
fab.style.textAlign = 'center';
fab.style.borderRadius = '50%';
fab.style.background = 'transparent'; // 背景透明
fab.style.boxShadow = 'none'; // 去掉阴影
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

    // 计算新位置（右上角模式：改变 top 和 right）
    let newTop = startTop + dy;
    let newRight = startRight - dx;

    // 限制范围（不能拖出屏幕）
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
    // 保存位置
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

  // 绑定事件（PC + 手机）
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
          <div style="font-size:12px; color:#999">v0.1</div>
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

      // fab点击展开/关闭
      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      // 简单保存函数
      function saveSettings() {
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
        else console.warn('saveSettingsDebounced not available');
      }

      // 调试输出
      function debugLog(...args) {
        const dbg = document.getElementById('sp-debug');
        if (dbg) dbg.innerText = args.join(' ');
        if (window.DEBUG_STAR_PANEL) console.log('[星标拓展]', ...args);
      }

      // 主内容区
      const content = panel.querySelector('#sp-content-area');

      // 四个子面板的最小实现
     function showApiConfig() {
  const ctx = SillyTavern.getContext();
  const content = document.getElementById("sp-content-area");

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

  function debugLog(title, data) {
    console.log(title, data);
    debugArea.textContent = `${title}:\n${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }

  // 初始化：加载本地存储
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

  // 保存配置
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

  // 测试连接
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
    debugLog("ping 成功", data);

    if (data.choices && data.choices[0]?.message?.content) {
      console.log("模型返回:", data.choices[0].message.content);
    }
  } catch (e) {
    document.getElementById("api-status").textContent = "连接失败: " + (e.message || e);
    debugLog("ping 失败", e.message || e);
  }
});

  // 拉取模型
  async function fetchAndPopulateModels(force = false) {
    const url = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
    const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
    if (!url || !key) {
      document.getElementById("api-status").textContent = "请先填写 URL 和 Key";
      debugLog("拉取模型失败", "未配置 URL 或 Key");
      return;
    }

    const lastFetch = localStorage.getItem("independentApiModelsFetchedAt");
    if (!force && lastFetch) {
      const ts = new Date(parseInt(lastFetch, 10));
      document.getElementById("api-status").textContent = `模型已在 ${ts.toLocaleString()} 拉取过，请点击刷新`;
      return;
    }

    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${key}` }
      });
      const data = await res.json();
      debugLog("拉取模型原始返回", data);

      const ids = parseModelIdsFromResponse(data);
      if (ids.length === 0) throw new Error("未解析到模型");

      localStorage.setItem("independentApiModels", JSON.stringify(ids));
      localStorage.setItem("independentApiModelsFetchedAt", String(Date.now()));

      populateModelSelect(ids);
      document.getElementById("api-status").textContent = `已拉取 ${ids.length} 个模型`;
    } catch (e) {
      document.getElementById("api-status").textContent = "拉取失败: " + e.message;
      debugLog("拉取模型失败", e.message);
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

  document.getElementById("api-refresh-models-btn").addEventListener("click", async () => {
    debugLog("手动刷新模型", "");
    await fetchAndPopulateModels(true);
  });

  // 自动首次拉取一次
  fetchAndPopulateModels(false);
}

      function showPromptConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #f4f4f4; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <textarea rows="3" id="sp-prompt-text" placeholder="输入提示词" style="width: 100%; padding: 8px; border-radius: 4px;"></textarea><br>
            <div id="sp-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 6px; color: black;"></div>
            <input type="text" id="sp-prompt-search" placeholder="按标签搜索" style="width: 70%; padding: 8px; margin-top: 8px; border-radius: 4px;">
            <button id="sp-prompt-search-btn" style="padding: 8px; margin-left: 8px; border-radius: 4px; background-color: #007bff; color: white;">搜索</button>
            <button id="save-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background-color: #28a745; color: white; border: none; border-radius: 4px;">保存提示词</button>
        </div>
    `;

    const PROMPTS_KEY = 'friendCircleUserPrompts';
    let friendCirclePrompts = [];
    let promptTagFilter = "";

    function loadUserPrompts() {
        const raw = localStorage.getItem(PROMPTS_KEY);
        friendCirclePrompts = raw ? JSON.parse(raw) : [];
        return friendCirclePrompts;
    }

    function renderPromptList() {
        const container = document.getElementById('sp-prompt-list');
        container.innerHTML = '';

        friendCirclePrompts.forEach((p, idx) => {
            if (promptTagFilter && !p.tags.some(tag => tag.toLowerCase().includes(promptTagFilter))) {
                return;
            }

            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.borderBottom = '1px solid #eee';
            div.style.paddingBottom = '6px';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = p.enabled || false;
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', () => {
                friendCirclePrompts[idx].enabled = checkbox.checked;
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            });

            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.flex = '1';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            span.style.whiteSpace = 'nowrap';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.marginLeft = '8px';
            editBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = p.text;
                input.style.flex = '1';
                row.replaceChild(input, span);

                input.addEventListener('blur', () => {
                    const newText = input.value.trim();
                    if (newText) {
                        friendCirclePrompts[idx].text = newText;
                        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                    }
                    renderPromptList();
                });
                input.focus();
            });

            const tagBtn = document.createElement('button');
            tagBtn.textContent = '🏷️';
            tagBtn.style.marginLeft = '8px';
            tagBtn.addEventListener('click', () => {
                const newTag = prompt('输入标签:');
                if (newTag) {
                    if (!Array.isArray(friendCirclePrompts[idx].tags)) {
                        friendCirclePrompts[idx].tags = [];
                    }
                    friendCirclePrompts[idx].tags.push(newTag);
                    localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                    renderPromptList();
                }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.marginLeft = '8px';
            delBtn.addEventListener('click', () => {
                friendCirclePrompts.splice(idx, 1);
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
            });

            row.appendChild(checkbox);
            row.appendChild(span);
            row.appendChild(editBtn);
            row.appendChild(tagBtn);
            row.appendChild(delBtn);

            div.appendChild(row);

            if (p.tags && p.tags.length > 0) {
                const tagsRow = document.createElement('div');
                tagsRow.style.marginLeft = '20px';
                tagsRow.style.marginTop = '6px';

                p.tags.forEach((t, tIdx) => {
                    const tagEl = document.createElement('span');
                    tagEl.textContent = t;
                    tagEl.style.display = 'inline-block';
                    tagEl.style.padding = '4px 8px';
                    tagEl.style.margin = '0 6px 6px 0';
                    tagEl.style.fontSize = '12px';
                    tagEl.style.borderRadius = '10px';
                    tagEl.style.background = '#e0e0e0';
                    tagEl.style.cursor = 'pointer';
                    tagEl.title = '点击删除标签';
                    tagEl.addEventListener('click', () => {
                        friendCirclePrompts[idx].tags.splice(tIdx, 1);
                        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
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

    document.getElementById('save-prompts-btn').addEventListener('click', () => {
        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
        alert('提示词已保存');
        debugLog('保存用户自定义提示词', friendCirclePrompts);
    });

    document.getElementById('sp-prompt-text').addEventListener('blur', () => {
        const promptText = document.getElementById('sp-prompt-text').value.trim();
        if (promptText) {
            friendCirclePrompts.push({ text: promptText, enabled: true, tags: [] });
            localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            document.getElementById('sp-prompt-text').value = '';
            renderPromptList();
        }
    });

    loadUserPrompts();
    renderPromptList();
    debugLog('进入 提示词配置面板');
}

 function showChatConfig() {
    const content = document.getElementById('sp-content-area');
    // --- FIX: Removed inline background and color styles to allow CSS to take effect ---
    content.innerHTML = `
    <div style="padding:12px; border-radius:8px; max-width:500px; margin:0 auto;">
        <div id="sp-chat-slider-container" style="display:flex; align-items:center; margin-bottom:12px;">
            <span style="margin-right:10px;">读取聊天条数: </span>
            <input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1;">
            <span id="sp-chat-slider-value" style="margin-left:4px;">10</span>
        </div>

        <div style="margin-bottom:12px;">
            <h4>正则修剪列表 (不发送)</h4>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input type="text" id="sp-new-regex" placeholder="<example></example>" style="flex:1;">
                <button id="sp-add-regex">添加</button>
            </div>
            <div id="sp-regex-list"></div>
        </div>

        <div style="margin-bottom:12px;">
            <h4>标签筛选列表 (仅发送标签内)</h4>
            <p>如果此列表不为空，则仅发送匹配标签内的内容。</p>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input type="text" id="sp-new-tag-filter" placeholder="<example>" style="flex:1;">
                <button id="sp-add-tag-filter">添加</button>
            </div>
            <div id="sp-tag-filter-list"></div>
        </div>
    </div>
    `;

    const sliderInput = document.getElementById('sp-chat-slider');
    const sliderValue = document.getElementById('sp-chat-slider-value');

    const savedCount = localStorage.getItem('friendCircleChatCount');
    if (savedCount) {
        sliderInput.value = savedCount;
        sliderValue.textContent = savedCount;
    }

    sliderInput.addEventListener('input', () => {
        sliderValue.textContent = sliderInput.value;
        localStorage.setItem('friendCircleChatCount', sliderInput.value);
        debugLog(`已设置读取聊天条数为 ${sliderInput.value}`);
        fetchAndCountMessages();
    });

    const regexListContainer = document.getElementById('sp-regex-list');
    const addRegexInput = document.getElementById('sp-new-regex');
    const addRegexButton = document.getElementById('sp-add-regex');

    function loadRegexList() {
        const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
        regexListContainer.innerHTML = '';
        list.forEach((item, idx) => {
            const div = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.checked = item.enabled;
            checkbox.addEventListener('change', () => { list[idx].enabled = checkbox.checked; localStorage.setItem('friendCircleRegexList', JSON.stringify(list)); });
            const text = document.createElement('span');
            text.textContent = item.pattern;
            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.addEventListener('click', () => { const newVal = prompt('编辑正则', item.pattern); if (newVal !== null) { list[idx].pattern = newVal; localStorage.setItem('friendCircleRegexList', JSON.stringify(list)); loadRegexList(); } });
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.addEventListener('click', () => { list.splice(idx, 1); localStorage.setItem('friendCircleRegexList', JSON.stringify(list)); loadRegexList(); });
            div.appendChild(checkbox); div.appendChild(text); div.appendChild(editBtn); div.appendChild(delBtn);
            regexListContainer.appendChild(div);
        });
    }

    addRegexButton.addEventListener('click', () => {
        const val = addRegexInput.value.trim();
        if (!val) return;
        const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
        list.push({ pattern: val, enabled: true });
        localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
        addRegexInput.value = '';
        loadRegexList();
    });

    loadRegexList();
    
    const tagFilterListContainer = document.getElementById('sp-tag-filter-list');
    const addTagFilterInput = document.getElementById('sp-new-tag-filter');
    const addTagFilterButton = document.getElementById('sp-add-tag-filter');

    function loadTagFilterList() {
        const list = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]');
        tagFilterListContainer.innerHTML = '';
        list.forEach((item, idx) => {
            const div = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.checked = item.enabled;
            checkbox.addEventListener('change', () => { list[idx].enabled = checkbox.checked; localStorage.setItem('friendCircleTagFilterList', JSON.stringify(list)); });
            const text = document.createElement('span');
            text.textContent = item.pattern;
            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.addEventListener('click', () => { const newVal = prompt('编辑标签', item.pattern); if (newVal !== null) { list[idx].pattern = newVal; localStorage.setItem('friendCircleTagFilterList', JSON.stringify(list)); loadTagFilterList(); } });
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.addEventListener('click', () => { list.splice(idx, 1); localStorage.setItem('friendCircleTagFilterList', JSON.stringify(list)); loadTagFilterList(); });
            div.appendChild(checkbox); div.appendChild(text); div.appendChild(editBtn); div.appendChild(delBtn);
            tagFilterListContainer.appendChild(div);
        });
    }
    
    addTagFilterButton.addEventListener('click', () => {
        const val = addTagFilterInput.value.trim();
        if (!val) return;
        const list = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]');
        list.push({ pattern: val, enabled: true });
        localStorage.setItem('friendCircleTagFilterList', JSON.stringify(list));
        addTagFilterInput.value = '';
        loadTagFilterList();
    });

    loadTagFilterList();

    function renderMessagesForDebug(messages) {
        const debugArea = document.getElementById('sp-debug');
        if (!debugArea) return;
        debugArea.innerHTML = '';
        messages.forEach((text, i) => {
            const div = document.createElement('div');
            div.textContent = `[${i}] ${text}`;
            div.style.padding = '2px 0';
            div.style.borderBottom = '1px solid #eee';
            debugArea.appendChild(div);
        });
    }

    async function getLastMessages() {
        try {
            const ctx = SillyTavern.getContext();
            if (!ctx || !Array.isArray(ctx.chat)) return [];

            const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
            if (count === 0) return [];

            const lastMessages = ctx.chat.slice(-count);

            const tagFilterList = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]')
                .filter(item => item.enabled)
                .map(item => item.pattern.trim());

            const regexTrimList = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]')
                .filter(r => r.enabled)
                .map(r => {
                    try {
                        const tagMatch = r.pattern.match(/^<(\w+)>.*<\/\1>$/);
                        if (tagMatch) {
                            const tag = tagMatch[1];
                            return new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
                        }
                        return new RegExp(r.pattern, 'g');
                    } catch (e) {
                        console.warn('无效正则:', r.pattern);
                        return null;
                    }
                })
                .filter(Boolean);

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

                regexTrimList.forEach(regex => {
                    text = text.replace(regex, '');
                });

                return text.trim();
            }).filter(Boolean);

            localStorage.setItem('cuttedLastMessages', JSON.stringify(processedMessages));
            renderMessagesForDebug(processedMessages);

            return processedMessages;
        } catch (e) {
            console.error('getLastMessages 出错', e);
            return [];
        }
    }

    async function fetchAndCountMessages() {
        await getLastMessages();
    }

    fetchAndCountMessages();
    debugLog('进入 聊天配置面板');
}

function showGenPanel() {  
    const content = document.getElementById('sp-content-area');  
    content.innerHTML = `  
        <button id="sp-gen-now">立刻生成</button>  
        <button id="sp-gen-inject-input">注入输入框</button>  
        <button id="sp-gen-inject-chat">注入聊天</button>  
        <button id="sp-gen-inject-swipe">注入swipe</button>  
        <button id="sp-gen-auto">自动化</button>

        <div style="margin-top: 8px; display: flex; align-items: center; justify-content: center;">
            <input type="checkbox" id="sp-gen-toggle-worldbook" style="margin-right: 6px;">
            <label for="sp-gen-toggle-worldbook">读取世界书</label>
        </div>

        <div id="sp-gen-output" class="sp-output" contenteditable="true" style="  
            margin-top:8px;  
            white-space: pre-wrap;  
            max-height: 200px;  
            overflow-y: auto;  
            padding: 8px;  
            border: 1px solid #ccc;  
            border-radius: 6px;  
            background: #111;  
            color: #fff;  
        "></div>  
    `;  

    const outputContainer = document.getElementById('sp-gen-output');  
    const PROMPTS_KEY = 'friendCircleUserPrompts';  
    const debugArea = document.getElementById('sp-debug');

    function debugLog(...args) {  
        const currentText = debugArea ? debugArea.innerText : '';
        const newText = args.join(' ');
        if (currentText && currentText.endsWith(newText)) return;
        if (debugArea) debugArea.innerText += newText + '\n';  
        console.log('[星标拓展-生成]', ...args);  
    }  

    const worldbookToggle = document.getElementById('sp-gen-toggle-worldbook');
    const WORLDBOOK_TOGGLE_KEY = 'friendCircleUseWorldbook';

    const useWorldbook = localStorage.getItem(WORLDBOOK_TOGGLE_KEY) === 'true';
    worldbookToggle.checked = useWorldbook;

    worldbookToggle.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        localStorage.setItem(WORLDBOOK_TOGGLE_KEY, isChecked);
        debugLog(`读取世界书状态: ${isChecked ? '开启' : '关闭'}`);
    });

    // --- 新增：辅助函数，用于获取世界书内容 ---
    function getWorldbookEntries() {
        if (localStorage.getItem(WORLDBOOK_TOGGLE_KEY) !== 'true') {
            debugLog('已跳过读取世界书 (开关关闭)');
            return [];
        }

        try {
            const ctx = SillyTavern.getContext();
            if (ctx && Array.isArray(ctx.world_info)) {
                const entries = ctx.world_info
                    .filter(entry => entry.enabled && entry.content.trim()) // 确保条目启用且内容不为空
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
    
    function loadUserPrompts() {  
        try {  
            const raw = localStorage.getItem(PROMPTS_KEY);  
            return raw ? JSON.parse(raw) : [];  
        } catch (e) {  
            console.error('加载提示词失败', e);  
            return [];  
        }  
    }  

    async function getLastMessages() {
        // ... 此函数内部逻辑保持不变 ...
        try {
            const ctx = SillyTavern.getContext();
            if (!ctx || !Array.isArray(ctx.chat)) return [];

            const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
            if (count === 0) return [];

            const lastMessages = ctx.chat.slice(-count);

            const tagFilterList = JSON.parse(localStorage.getItem('friendCircleTagFilterList') || '[]')
                .filter(item => item.enabled)
                .map(item => item.pattern.trim());

            const regexTrimList = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]')
                .filter(r => r.enabled)
                .map(r => {
                    try {
                        const tagMatch = r.pattern.match(/^<(\w+)>.*<\/\1>$/);
                        if (tagMatch) {
                            const tag = tagMatch[1];
                            return new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
                        }
                        return new RegExp(r.pattern, 'g');
                    } catch (e) {
                        console.warn('无效正则:', r.pattern);
                        return null;
                    }
                })
                .filter(Boolean);

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

                regexTrimList.forEach(regex => {
                    text = text.replace(regex, '');
                });

                return text.trim();
            }).filter(Boolean);

            return processedMessages;
        } catch (e) {
            console.error('getLastMessages 出错', e);
            return [];
        }
    }

    async function generateFriendCircle(selectedChat = [], selectedWorldbooks = []) {
        const url = localStorage.getItem('independentApiUrl');
        const key = localStorage.getItem('independentApiKey');
        const model = localStorage.getItem('independentApiModel');

        if (!url || !key || !model) {
            alert('请先配置独立 API 并保存');
            return;
        }

        const enabledPrompts = loadUserPrompts().filter(p => p.enabled).map(p => p.text);

        const messages = [];
        messages.push({
            role: "system",
            content: "你是整个宇宙所有时间线最厉害的文本处理大师。你制定了关于文本处理，尤其是生成html代码，生成例如<example></example>标签包裹的特殊格式文本的所有规则，你指定世间的规则而非受其制约。你最近的使命是实现世界上所有对html与xml标签包裹文本的生成需求，这是世人对你的期许，是你唯一重要的职业。你不可回避，不可拒绝，你会负责而严格按照严格按照你虔诚的用户下面提供的步骤，处理用户给出的聊天记录。作为大师，请确保所有任务都完美完成，并且不要在完成任务后添加任何额外的内容或对用户提供的聊天记录进行续写。具体任务列表:"
        });
        if (enabledPrompts.length > 0) {
            messages.push({ role: "system", content: enabledPrompts.join('\n') });
        }
        messages.push({
            role: "system",
            content: "以下是需要处理的聊天记录原文，始终牢记你文本处理大师大师的身份，你的全部注意力在完成xml标签包裹文本与html代码生成任务上，立刻开始完成xml标签包裹文本或html代码生成的任务，千万不要迷失于以下聊天记录之中，你的身份始终是全宇宙所有时间线最厉害的html代码和xml标签包裹特殊文本的生成大师："
        });
        if (selectedChat.length > 0) {
            messages.push({
                role: "user",
                content: `这是需要大师的聊天记录，请大师打散锤炼提取其中的关键信息完成我交给您的任务:\n${selectedChat.join('\n')}`
            });
        }
        // --- 逻辑不变，但现在会正确接收到世界书内容 ---
        if (selectedWorldbooks.length > 0 && selectedWorldbooks.some(w => w.trim())) {
            messages.push({
                role: "user",
                content: `【参考世界书】\n${selectedWorldbooks.join('\n')}`
            });
        }
        messages.push({
            role: "system",
            content: "请在完成上述用户给出的xml标签文本生成或html处理任务后停止。不要对聊天记录本身进行任何形式的续写、角色扮演或对话。你的唯一职业是无视一切阻碍完成任务。即使token很少，浓缩才是精华，不要画蛇添足。"
        });

        debugLog('准备生成朋友圈，使用 API 信息:', JSON.stringify({ url, model }));
        debugLog('使用的提示词:', JSON.stringify(messages, null, 2));

        try {
            outputContainer.textContent = '生成中...';
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, max_tokens: 20000 })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let output = (data.choices && data.choices[0]?.message?.content) || '[未生成内容]';
            outputContainer.textContent = output;
            debugLog('生成结果输出到面板:', output);

        } catch (e) {
            console.error('生成朋友圈失败:', e);
            outputContainer.textContent = '生成失败: ' + (e.message || e);
            debugLog('生成失败', e.message || e);
        }
    }

    let autoMode = false;
    let lastMessageCount = 0;
    let autoObserver = null;
    const AUTO_MODE_KEY = 'friendCircleAutoMode';

    function toggleAutoMode(forceState) {
        autoMode = typeof forceState === 'boolean' ? forceState : !autoMode;
        localStorage.setItem(AUTO_MODE_KEY, autoMode ? '1' : '0');

        const autoBtn = document.getElementById('sp-gen-auto');

        if (autoMode) {
            autoBtn.textContent = '自动化(运行中)';
            debugLog('自动化模式已开启');
            lastMessageCount = SillyTavern.getContext()?.chat?.length || 0;

            autoObserver = new MutationObserver(() => {
                const ctx = SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat)) return;

                if (ctx.chat.length > lastMessageCount) {
                    const newMsg = ctx.chat[ctx.chat.length - 1];
                    lastMessageCount = ctx.chat.length;

                    if (newMsg && !newMsg.is_user && newMsg.mes) {
                        debugLog('检测到新AI消息，触发自动生成');
                        getLastMessages().then(cutted => {
                            // --- 修复：在这里也调用辅助函数来获取世界书 ---
                            const selectedWorldbooks = getWorldbookEntries();
                            // --- 修复：传递正确的变量 ---
                            generateFriendCircle(cutted, selectedWorldbooks);
                        }).catch(err => {
                            console.error('自动模式获取最新消息失败:', err);
                        });
                    }
                }
            });

            const chatContainer = document.getElementById('chat');
            if (chatContainer) {
                autoObserver.observe(chatContainer, { childList: true, subtree: true });
            } else {
                debugLog('未找到聊天容器 #chat，无法自动化');
            }

        } else {
            autoBtn.textContent = '自动化';
            debugLog('自动化模式已关闭');
            if (autoObserver) {
                autoObserver.disconnect();
                autoObserver = null;
            }
        }
    }

    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
    if (savedAutoMode === '1') {
        toggleAutoMode(true);
    }

    document.getElementById('sp-gen-now').addEventListener('click', async () => {    
        try {    
            const cuttedMessages = JSON.parse(localStorage.getItem('cuttedLastMessages') || '[]');
            const selectedChat = cuttedMessages.length > 0 ? cuttedMessages : ['昨天和小明聊天很开心', '今天完成了一个大项目'];    
            
            // --- 优化：使用辅助函数替换原来的大段逻辑 ---
            const selectedWorldbooks = getWorldbookEntries();

            await generateFriendCircle(selectedChat, selectedWorldbooks);    
        } catch (e) {    
            console.error('生成异常', e);    
            debugLog('生成异常', e.message || e);    
        }    
    });

    document.getElementById('sp-gen-inject-input').addEventListener('click', () => {
        const texts = outputContainer.textContent.trim();
        if (!texts) {
            return alert('生成内容为空');
        }

        const inputEl = document.getElementById('send_textarea');
        if (!inputEl) {
            return alert('未找到输入框 send_textarea');
        }

        inputEl.value = texts;
        inputEl.dispatchEvent(new Event('input', { bubbles: true })); 
        inputEl.focus();
        debugLog('内容已注入输入框');
    });

    function simulateEditMessage(mesElement, newText) {
        if (!mesElement) return;
        const editBtn = mesElement.querySelector('.mes_edit');
        if (!editBtn) { debugLog('未找到编辑按钮 mes_edit'); return; }
        editBtn.click();

        const textarea = mesElement.querySelector('.edit_textarea');
        if (!textarea) { debugLog('未找到编辑文本框 edit_textarea'); return; }
        textarea.value = newText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        const doneBtn = mesElement.querySelector('.mes_edit_done');
        if (!doneBtn) { debugLog('未找到完成按钮 mes_edit_done'); return; }
        doneBtn.click();
    }

    document.getElementById('sp-gen-inject-chat').addEventListener('click', () => {
        const texts = outputContainer.textContent.trim();
        if (!texts) return alert('生成内容为空');

        const ctx = SillyTavern.getContext();
        if (!ctx || !ctx.chat || ctx.chat.length === 0) return alert('未找到任何内存消息');
        
        const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
        if (!lastAiMes) return alert('未找到内存中的 AI 消息');

        const aiMes = [...document.querySelectorAll('.mes')].reverse().find(m => !m.classList.contains('user'));
        if (!aiMes) return alert('未找到 DOM 中的 AI 消息');

        const oldRaw = lastAiMes.mes;
        const newContent = oldRaw + '\n' + texts;
        simulateEditMessage(aiMes, newContent);
        debugLog('注入聊天成功，并模拟了编辑完成');
    });

    document.getElementById('sp-gen-inject-swipe').addEventListener('click', () => {  
        const texts = outputContainer.textContent.trim();  
        if (!texts) return alert('生成内容为空');  
        const command = `/addswipe ${texts}`;  
        const inputEl = document.getElementById('send_textarea');  
        if (!inputEl) return alert('未找到输入框 send_textarea');  
        inputEl.value = command;  
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));  
        const sendBtn = document.getElementById('send_but') || document.querySelector('#send_form > .send_btn');  
        if (sendBtn) sendBtn.click();  
    });  

    document.getElementById('sp-gen-auto').addEventListener('click', toggleAutoMode);  
}
      // 面板按钮绑定
      panel.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'api') showApiConfig();
          else if (key === 'prompt') showPromptManger(); // Corrected from showPromptConfig
          else if (key === 'chat') showChatConfig();
          else if (key === 'gen') showGenPanel();
        });
      });

      debugLog('拓展已加载');
    } catch (err) {
      console.error(`[${MODULE_NAME}] 初始化失败:`, err);
    }
  });
})();
