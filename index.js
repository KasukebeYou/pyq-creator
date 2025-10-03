// --- 星标拓展 v0.2.5 (最终稳定版) ---
// --- 已集成世界书读取与生成功能 v1.0 ---
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, saveChat } from "../../../../script.js";

(function () {
  const MODULE_NAME = '星标拓展';

  // 等待 ST 环境准备
  function ready(fn) {
    if (window.SillyTavon && SillyTavern.getContext) return fn();
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

      // 初始化插件设置 (如果不存在)
      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          apiConfig: {},
          prompts: [],
          chatConfig: { strength: 5, regexList: [] },
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      // 防止重复加载UI
      if (document.getElementById('star-fab')) return;

      // --- 创建悬浮按钮 (FAB) ---
      const fab = document.createElement('div');
      fab.id = 'star-fab';
      fab.title = MODULE_NAME;
      fab.innerText = '🌟';

      // 恢复上次的位置
      const savedTop = localStorage.getItem('starFabTop');
      const savedRight = localStorage.getItem('starFabRight');
      if (savedTop && savedRight) {
        fab.style.top = savedTop;
        fab.style.right = savedRight;
      } else {
        // 默认居中
        const centerTop = (window.innerHeight / 2 - 16) + 'px';
        const centerRight = (window.innerWidth / 2 - 16) + 'px';
        fab.style.top = centerTop;
        fab.style.right = centerRight;
      }
      document.body.appendChild(fab);

      // --- 使悬浮按钮可拖动 ---
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
        fab.addEventListener('mousedown', onStart);
        fab.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
      })();

      // --- 创建主面板 ---
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

      // --- FAB 点击事件，切换面板显示 ---
      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      // --- 调试日志函数 ---
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

      // --- API 配置面板 ---
      function showApiConfig() {
        // ... (您的原始代码，无需修改)
      }

      // --- 提示词配置面板 ---
      function showPromptConfig() {
        // ... (您的原始代码，无需修改)
      }

      // --- 聊天配置面板 ---
      function showChatConfig() {
        // ... (您的原始代码，无需修改)
      }

    // ##################################################################
    // ############## 【核心修改】世界书配置面板函数 ##############
    // ##################################################################
    async function showWorldbookConfig() {
        content.innerHTML = `<div class="sp-small">正在加载世界书模块...</div>`;

        try {
            // 动态导入酒馆内置的 world-info.js 模块
            const worldInfoModule = await import('../../../../scripts/world-info.js');
            // 从模块中解构出我们需要的函数和变量
            const { getLorebookEntries, world_names } = worldInfoModule;

            // 渲染世界书配置界面的 HTML
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

            // 定义用于 localStorage 的键名，避免冲突
            const KEYS = {
                ENABLED: 'star_wb_enabled',
                MODE: 'star_wb_mode',
                MANUAL_BOOKS: 'star_wb_manual_books',
                SELECTED_ENTRIES: 'star_wb_selected_entries',
                CHAR_LIMIT: 'star_wb_char_limit',
            };

            // 获取所有UI元素的引用
            const enabledToggle = document.getElementById('wb-enabled-toggle');
            const optionsContainer = document.getElementById('wb-options-container');
            const modeRadios = document.querySelectorAll('input[name="wb-source-mode"]');
            const manualSelectWrapper = document.getElementById('wb-manual-select-wrapper');
            const refreshBtn = document.getElementById('wb-refresh-books-btn');
            const bookList = document.getElementById('wb-book-list');
            const entryList = document.getElementById('wb-entry-list');
            const limitSlider = document.getElementById('wb-char-limit-slider');
            const limitValue = document.getElementById('wb-char-limit-value');

            // 从 localStorage 加载设置，如果不存在则使用默认值
            const settings = {
                enabled: localStorage.getItem(KEYS.ENABLED) === 'true',
                mode: localStorage.getItem(KEYS.MODE) || 'auto',
                manualBooks: JSON.parse(localStorage.getItem(KEYS.MANUAL_BOOKS) || '[]'),
                selectedEntries: JSON.parse(localStorage.getItem(KEYS.SELECTED_ENTRIES) || '{}'),
                charLimit: parseInt(localStorage.getItem(KEYS.CHAR_LIMIT) || '3000', 10),
            };

            // 保存设置到 localStorage
            const saveSettings = () => {
                localStorage.setItem(KEYS.ENABLED, settings.enabled);
                localStorage.setItem(KEYS.MODE, settings.mode);
                localStorage.setItem(KEYS.MANUAL_BOOKS, JSON.stringify(settings.manualBooks));
                localStorage.setItem(KEYS.SELECTED_ENTRIES, JSON.stringify(settings.selectedEntries));
                localStorage.setItem(KEYS.CHAR_LIMIT, settings.charLimit);
                debugLog('世界书配置已保存', settings);
            };

            // 核心函数：渲染条目列表
            const renderEntries = async () => {
                entryList.innerHTML = `<div class="sp-small">正在加载条目...</div>`;
                let targetBookNames = [];

                if (settings.mode === 'auto') {
                    // 自动模式：从当前角色上下文获取世界书
                    const ctx = getContext();
                    const character = ctx.characters[ctx.characterId];
                    if (!character) {
                        entryList.innerHTML = `<div class="sp-small">请先选择一个角色。</div>`;
                        return;
                    }
                    // 使用 Set 自动去重
                    const books = new Set();
                    // SillyTavern 存储世界书的几个不同位置
                    if (ctx.lorebook_id) books.add(ctx.lorebook_id);
                    if (character.data?.extensions?.world) books.add(character.data.extensions.world); // 兼容新版
                    if (Array.isArray(character.data?.extensions?.world_books)) { // 兼容新版
                        character.data.extensions.world_books.forEach(book => books.add(book));
                    }
                    targetBookNames = Array.from(books);
                    debugLog('自动模式检测到世界书:', targetBookNames);

                } else {
                    // 手动模式：使用用户勾选的世界书
                    targetBookNames = settings.manualBooks;
                    debugLog('手动模式使用世界书:', targetBookNames);
                }

                if (targetBookNames.length === 0) {
                    entryList.innerHTML = `<div class="sp-small">未选择或绑定任何世界书。</div>`;
                    return;
                }

                const entriesToShow = [];
                try {
                    // 遍历所有目标世界书，异步获取它们的条目
                    for (const bookName of targetBookNames) {
                        const entries = await getLorebookEntries(bookName);
                        if (entries) {
                            // 将书名和条目信息一起保存
                            entries.forEach(entry => {
                                entriesToShow.push({ ...entry, book: bookName });
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

                // 动态创建每个条目的复选框和标签
                entriesToShow.forEach(entry => {
                    const div = document.createElement('div');
                    div.title = `来自: ${entry.book}\nUID: ${entry.uid}`;
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    const entryId = `${entry.book}::${entry.uid}`; // 使用 '书名::UID' 作为唯一标识
                    checkbox.id = `wb-entry-${entryId}`;
                    checkbox.dataset.entryId = entryId;
                    checkbox.checked = settings.selectedEntries[entryId] === true;

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.textContent = entry.comment || entry.title || `(无标题条目: ${entry.key ? entry.key[0] : '...'})`;

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    entryList.appendChild(div);
                });
            };
            
            // 渲染世界书列表 (仅在手动模式下)
            const renderBooks = async () => {
                bookList.innerHTML = '';
                const bookNames = world_names || []; // 从酒馆API获取所有世界书文件名

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
                    label.textContent = bookName.replace('.json', ''); // 显示更友好的名称

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    bookList.appendChild(div);
                });
            };

            // 更新整个UI的状态
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

            // --- 绑定所有事件监听器 ---
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
                toastr.info('世界书列表已刷新');
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
                    await renderEntries(); // 重新渲染条目列表
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

            // 初始加载UI
            await updateUI();
            debugLog('进入 世界书配置面板');

        } catch (err) {
            content.innerHTML = `<div class="sp-small" style="color:red;">加载世界书模块失败。请检查控制台错误。</div>`;
            debugLog('世界书模块加载失败:', err);
            console.error('[星标拓展] Worldbook module failed to load:', err);
        }
    }

    // ##################################################################
    // ############## 【核心修改】生成面板函数 ##############
    // ##################################################################
    async function showGenPanel() {
        content.innerHTML = `<div class="sp-small">正在加载生成模块...</div>`;

        try {
            // 再次导入酒馆模块，以防万一
            const worldInfoModule = await import('../../../../scripts/world-info.js');
            const { getLorebookEntries } = worldInfoModule;

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

            // 新增的核心函数：获取用户在世界书面板勾选的所有条目的内容
            async function getSelectedWorldbookContent() {
                const KEYS = {
                    ENABLED: 'star_wb_enabled',
                    SELECTED_ENTRIES: 'star_wb_selected_entries',
                    CHAR_LIMIT: 'star_wb_char_limit',
                };

                // 如果总开关未启用，直接返回空
                if (localStorage.getItem(KEYS.ENABLED) !== 'true') {
                    debugLog('世界书读取已禁用，跳过。');
                    return [];
                }

                const selectedEntryIds = JSON.parse(localStorage.getItem(KEYS.SELECTED_ENTRIES) || '{}');
                const charLimit = parseInt(localStorage.getItem(KEYS.CHAR_LIMIT) || '3000', 10);

                // 将选中的条目按书名分组，方便批量获取
                const booksToFetch = {};
                for (const entryId in selectedEntryIds) {
                    if (selectedEntryIds[entryId] === true) {
                        const [bookName, uid] = entryId.split('::');
                        if (!booksToFetch[bookName]) booksToFetch[bookName] = [];
                        booksToFetch[bookName].push(uid);
                    }
                }

                let combinedContent = '';
                let entriesCount = 0;
                for (const bookName in booksToFetch) {
                    try {
                        // 一次性获取一整本书的所有条目
                        const allEntriesInBook = await getLorebookEntries(bookName);
                        if (allEntriesInBook) {
                            const uidsToGet = booksToFetch[bookName];
                            // 从中筛选出用户勾选的
                            const selectedEntriesInBook = allEntriesInBook.filter(entry => uidsToGet.includes(String(entry.uid)));
                            // 拼接内容
                            combinedContent += selectedEntriesInBook.map(e => e.content).join('\n\n') + '\n\n';
                            entriesCount += selectedEntriesInBook.length;
                        }
                    } catch (bookError) {
                        debugLog(`获取世界书 ${bookName} 内容时出错:`, bookError);
                    }
                }

                combinedContent = combinedContent.trim();
                // 应用长度限制
                if (combinedContent.length > charLimit) {
                    combinedContent = combinedContent.substring(0, charLimit);
                    debugLog(`世界书内容已根据限制 (${charLimit}字) 截断。`);
                }

                debugLog(`成功读取 ${entriesCount} 条世界书条目，总长度 ${combinedContent.length} 字。`);
                // 返回包含拼接好内容的数组（即使只有一个元素也用数组，方便后续处理）
                return [combinedContent].filter(Boolean);
            }

            // 修改 generateFriendCircle 函数，使其能接收世界书内容
            async function generateFriendCircle(selectedChat = [], selectedWorldbooks = []) {
                const url = localStorage.getItem('independentApiUrl'), key = localStorage.getItem('independentApiKey'), model = localStorage.getItem('independentApiModel');
                if (!url || !key || !model) { alert('请先配置独立 API 并保存'); return; }
                const enabledPrompts = JSON.parse(localStorage.getItem('friendCircleUserPrompts') || '[]').filter(p => p.enabled).map(p => p.text);
                const messages = [];
                messages.push({ role: "system", content: "你是整个宇宙所有时间线最厉害的文本处理大师..." });
                if (enabledPrompts.length > 0) messages.push({ role: "system", content: enabledPrompts.join('\n') });
                messages.push({ role: "system", content: "以下是需要处理的聊天记录原文..." });
                if (selectedChat.length > 0) messages.push({ role: "user", content: `这是需要大师的聊天记录...\n${selectedChat.join('\n')}` });
                
                // 【关键修改】如果传入了世界书内容，就将其作为一条新的 user 消息添加到 prompts 中
                if (selectedWorldbooks.length > 0 && selectedWorldbooks.some(w => w.trim())) {
                    messages.push({ role: "user", content: `【参考世界书】\n${selectedWorldbooks.join('\n')}` });
                }
                
                messages.push({ role: "system", content: "请在完成上述用户给出的...停止。" });

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

            // ... (您的自动化和注入代码，无需修改)

            // 【关键修改】修改 "立刻生成" 按钮的点击事件
            document.getElementById('sp-gen-now').addEventListener('click', async () => {
                try {
                    const cuttedMessages = JSON.parse(localStorage.getItem('cuttedLastMessages') || '[]');
                    const selectedChat = cuttedMessages.length > 0 ? cuttedMessages : [];
                    // 在生成前，调用新函数来获取世界书内容
                    const selectedWorldbooks = await getSelectedWorldbookContent();
                    // 将获取到的世界书内容传递给生成函数
                    await generateFriendCircle(selectedChat, selectedWorldbooks);
                } catch (e) {
                    console.error('生成异常', e);
                    debugLog('生成异常', e.message || e);
                }
            });

            // ... (您的注入按钮和其他代码)

        } catch(err) {
            content.innerHTML = `<div class="sp-small" style="color:red;">加载生成模块失败。请检查控制台错误。</div>`;
            debugLog('生成模块加载失败:', err);
            console.error('[星标拓展] Gen Panel module failed to load:', err);
        }
    }

      // --- 主面板标签页点击事件 ---
      panel.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.key;
          content.innerHTML = `<div class="sp-small">正在加载...</div>`;
          if (key === 'api') showApiConfig();
          else if (key === 'prompt') showPromptConfig();
          else if (key === 'chat') showChatConfig();
          else if (key === 'worldbook') await showWorldbookConfig(); // 确保异步调用
          else if (key === 'gen') await showGenPanel(); // 确保异步调用
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
