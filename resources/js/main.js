
// Initialize Neutralino
Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

const DATA_FILE = 'subscriptions.json';
let subscriptions = [];

const CONFIG_FILE = 'outputs/config.ini';
let configData = {};

const ARCHIVE_FILE = 'archives.json';
let archiveList = [];

// DOM Elements
const urlInput = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const refreshListBtn = document.getElementById('refreshListBtn');
const addSubscriptionBtn = document.getElementById('addSubscriptionBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const subscriptionTableBody = document.getElementById('subscriptionTableBody');

// Settings Modal Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const configForm = document.getElementById('configForm');

// Help Modal Elements
const openHelpBtn = document.getElementById('openHelpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const closeHelpBtnBottom = document.getElementById('closeHelpBtnBottom');

// Log Elements
const logFooter = document.getElementById('logFooter');
const logHeader = document.getElementById('logHeader');
const logContainer = document.getElementById('logContainer');
const lastLogMsg = document.getElementById('lastLogMsg');
const clearLogBtn = document.getElementById('clearLogBtn');
const toggleLogBtn = document.getElementById('toggleLogBtn');

// Markdown Modal Elements
const markdownModal = document.getElementById('markdownModal');
const closeMdModalBtn = document.getElementById('closeMdModalBtn');
const closeMdModalBtnBottom = document.getElementById('closeMdModalBtnBottom');
const openExternalBtn = document.getElementById('openExternalBtn');
const fixImageLinksBtn = document.getElementById('fixImageLinksBtn');
const viewAllImagesBtn = document.getElementById('viewAllImagesBtn');
const mdContent = document.getElementById('mdContent');
const mdModalTitle = document.getElementById('mdModalTitle');
const mdModalSubtitle = document.getElementById('mdModalSubtitle');

// Lightbox Elements
const imageLightbox = document.getElementById('imageLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightboxBtn = document.getElementById('closeLightboxBtn');
const prevImageBtn = document.getElementById('prevImageBtn');
const nextImageBtn = document.getElementById('nextImageBtn');
const lightboxThumbsContainer = document.getElementById('lightboxThumbsContainer');
const lightboxThumbs = document.getElementById('lightboxThumbs');
const lightboxMainArea = document.getElementById('lightboxMainArea');

// Tab Elements
const tabSubscription = document.getElementById('tabSubscription');
const tabArchive = document.getElementById('tabArchive');
const subscriptionView = document.getElementById('subscriptionView');
const archiveView = document.getElementById('archiveView');
const archiveTableBody = document.getElementById('archiveTableBody');
const refreshArchiveBtn = document.getElementById('refreshArchiveBtn');
const archiveCountBadge = document.getElementById('archiveCountBadge');

let currentLightboxImages = []; // Array of {src, alt}
let currentLightboxIndex = 0;

let isLogExpanded = false; // Default closed
let currentPage = 1;
const itemsPerPage = 50;

// Queue System Variables
let updateQueue = []; // Array of subscription IDs
let isProcessingQueue = false;
let isGlobalCooldown = false;
let schedulerInterval = null;
let updatingId = null; // ID of the subscription currently being updated manually or via queue
let cooldownTimer = null;
let cooldownSeconds = 0;
let activeDropdownId = null; // Track active dropdown for portal
let showActiveOnly = false; // Filter state

// --- Custom Modal Logic ---
const messageModal = document.getElementById('messageModal');
const msgTitle = document.getElementById('msgTitle');
const msgContent = document.getElementById('msgContent');
const msgConfirmBtn = document.getElementById('msgConfirmBtn');
const msgCancelBtn = document.getElementById('msgCancelBtn');
const msgIcon = document.getElementById('msgIcon');
const msgIconContainer = document.getElementById('msgIconContainer');

let msgResolve = null;

function showMessage(title, content, type = 'info', showCancel = false) {
    return new Promise((resolve) => {
        if (!messageModal) {
            // Fallback if modal elements are missing
            if (showCancel) {
                // Use native confirm if modal not ready
                resolve(window.confirm(`${title}\n\n${content}`)); 
            } else {
                // Use native alert, but be careful of loops if we override window.alert
                // Since we are inside showMessage which is called by overridden alert, we need a flag or direct call.
                // However, native alert is available on window prototype if we didn't delete it, 
                // but we are assigning window.alert = ...
                // So we can't easily call original alert if we overwrite it, unless we saved it.
                // But this fallback is rare (only if DOM missing).
                console.warn("Message Modal not found:", content);
                resolve(true);
            }
            return;
        }

        msgTitle.textContent = title;
        msgContent.innerHTML = content;
        
        // Icon styling
        msgIconContainer.className = 'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10';
        msgIcon.className = 'material-symbols-outlined';
        
        // Reset button classes
        msgConfirmBtn.className = 'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto';
        
        if (type === 'error') {
            msgIconContainer.classList.add('bg-red-100');
            msgIcon.classList.add('text-red-600');
            msgIcon.textContent = 'error';
            msgConfirmBtn.classList.add('bg-red-600', 'hover:bg-red-500');
        } else if (type === 'warning') {
            msgIconContainer.classList.add('bg-amber-100');
            msgIcon.classList.add('text-amber-600');
            msgIcon.textContent = 'warning';
            msgConfirmBtn.classList.add('bg-amber-600', 'hover:bg-amber-500');
        } else {
            msgIconContainer.classList.add('bg-blue-100');
            msgIcon.classList.add('text-blue-600');
            msgIcon.textContent = 'info';
            msgConfirmBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
        }

        if (showCancel) {
            msgCancelBtn.classList.remove('hidden');
        } else {
            msgCancelBtn.classList.add('hidden');
        }

        messageModal.classList.remove('hidden');
        msgResolve = resolve;
        
        // Focus confirm button for accessibility
        msgConfirmBtn.focus();
    });
}

if (msgConfirmBtn) {
    msgConfirmBtn.addEventListener('click', () => {
        messageModal.classList.add('hidden');
        if (msgResolve) msgResolve(true);
    });
}

if (msgCancelBtn) {
    msgCancelBtn.addEventListener('click', () => {
        messageModal.classList.add('hidden');
        if (msgResolve) msgResolve(false);
    });
}

// Override window.alert
window.alert = async (message) => {
    await showMessage('提示', message);
};

// Custom confirm (async)
window.showConfirm = async (message) => {
    return await showMessage('确认', message, 'warning', true);
};

// --- Initialization ---

async function init() {
    console.log("App initialized");
    
    // Set initial log state
    updateLogUI();
    
    addLog('INFO', '应用启动完成，等待操作...');
    await loadSubscriptions();
    renderSubscriptions();
    setupEventListeners();

    // Start Scheduler (runs every 1 second)
    schedulerInterval = setInterval(scheduler, 1000);

    // Load Archives
    await loadArchives();

    // Check for backend tools
    await checkBackendTools();
}

async function checkBackendTools() {
    try {
        // Ensure outputs directory exists
        const hasOutputsDir = await checkFileExists('outputs');
        if (!hasOutputsDir) {
            try {
                await Neutralino.filesystem.createDirectory('outputs');
                console.log("Created outputs directory");
            } catch (e) {
                console.error("Failed to create outputs directory:", e);
                // Continue execution to show missing files warning, 
                // or maybe the missing files check will handle it (since they won't exist).
            }
        }

        const hasExe = await checkFileExists('outputs/ngapost2md.exe');
        const hasConfig = await checkFileExists('outputs/config.ini');

        if (!hasExe || !hasConfig) {
            let missing = [];
            if (!hasExe) missing.push('ngapost2md.exe');
            if (!hasConfig) missing.push('config.ini');

            const downloadUrl = 'https://github.com/ludoux/ngapost2md/releases';
            const msg = `检测到 outputs 文件夹下缺少以下文件：<br><b>${missing.join(', ')}</b><br><br>` +
                        `请前往 GitHub Releases 页面下载最新版本，并解压到 outputs 文件夹中。<br><br>` +
                        `下载地址：<a href="#" onclick="Neutralino.os.open('${downloadUrl}'); return false;" class="text-blue-600 underline break-all">${downloadUrl}</a><br><br>` +
                        `点击确定按钮将自动打开下载页面地址。`;
            
            await showMessage('缺少必要文件', msg, 'warning');
            
            // Open download link as a fallback if they just click confirm
            await Neutralino.os.open(downloadUrl);
        }
    } catch (e) {
        console.error("Check backend tools failed:", e);
    }
}

async function checkFileExists(path) {
    try {
        await Neutralino.filesystem.getStats(path);
        return true;
    } catch (e) {
        return false;
    }
}

// --- Event Listeners ---

function setupEventListeners() {
    addSubscriptionBtn.addEventListener('click', () => handleAddSubscription());
    
    // Tab Listeners
    if (tabSubscription && tabArchive) {
        tabSubscription.addEventListener('click', () => switchTab('subscription'));
        tabArchive.addEventListener('click', () => switchTab('archive'));
    }

    if (refreshArchiveBtn) {
        refreshArchiveBtn.addEventListener('click', () => {
             scanArchives();
        });
    }

    refreshListBtn.addEventListener('click', async () => {
        await loadSubscriptions();
        renderSubscriptions();
        addLog('INFO', '订阅列表已刷新');
    });

    const clearSearchBtn = document.getElementById('clearSearchBtn');

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderSubscriptions();
        
        // Toggle clear button visibility
        if (searchInput.value.trim()) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    });
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentPage = 1;
            renderSubscriptions();
            clearSearchBtn.classList.add('hidden');
            searchInput.focus();
        });
    }
    
    clearInputBtn.addEventListener('click', () => {
        urlInput.value = '';
        urlInput.focus();
    });

    // Allow pressing Enter in input field
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddSubscription();
        }
    });

    // Filter Toggle Listeners
    const filterBtn = document.getElementById('filterBtn');
    const activeCountBadge = document.getElementById('activeCountBadge');

    const toggleFilter = () => {
        showActiveOnly = !showActiveOnly;
        currentPage = 1; // Reset page
        renderSubscriptions();
    };

    if (filterBtn) {
        filterBtn.addEventListener('click', toggleFilter);
    }
    
    if (activeCountBadge) {
        activeCountBadge.addEventListener('click', toggleFilter);
    }

    // Settings Modal Listeners
    openSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    cancelConfigBtn.addEventListener('click', closeSettings);
    saveConfigBtn.addEventListener('click', saveSettings);
    
    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal || e.target.querySelector('.bg-gray-500')) {
            // pass
        }
    });
    // Better backdrop click handling
    const backdrop = settingsModal.querySelector('.bg-gray-500');
    if(backdrop) {
        backdrop.addEventListener('click', closeSettings);
    }
    
    // Help Modal Listeners
    const closeHelp = () => {
        helpModal.classList.add('hidden');
    };
    
    if (openHelpBtn) {
        openHelpBtn.addEventListener('click', () => {
            helpModal.classList.remove('hidden');
        });
    }
    
    if (closeHelpBtn) closeHelpBtn.addEventListener('click', closeHelp);
    if (closeHelpBtnBottom) closeHelpBtnBottom.addEventListener('click', closeHelp);
    
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal || e.target.querySelector('.bg-gray-500')) {
                // pass (Neutralino might handle differently, but here we want backdrop click)
            }
        });
        const helpBackdrop = helpModal.querySelector('.bg-gray-500');
        if (helpBackdrop) {
            helpBackdrop.addEventListener('click', closeHelp);
        }
    }

    // Log Listeners
    clearLogBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        logContainer.innerHTML = '';
        lastLogMsg.textContent = '日志已清空';
        addLog('INFO', '日志已清空');
    });

    const toggleLog = () => {
        isLogExpanded = !isLogExpanded;
        updateLogUI();
    };

    toggleLogBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLog();
    });
    
    // Allow clicking header to toggle
    logHeader.addEventListener('click', toggleLog);

    // Markdown Modal Listeners
    const closeMd = () => {
        markdownModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
        const floatBtns = document.getElementById('mdFloatingBtns');
        if (floatBtns) floatBtns.classList.add('opacity-0', 'pointer-events-none');
    };
    closeMdModalBtn.addEventListener('click', closeMd);
    closeMdModalBtnBottom.addEventListener('click', closeMd);
    
    if (viewAllImagesBtn) {
        viewAllImagesBtn.addEventListener('click', () => {
            if (currentLightboxImages && currentLightboxImages.length > 0) {
                openLightbox(0);
            } else {
                 showMessage('提示', '当前文档没有可浏览的图片');
            }
        });
    }

    markdownModal.addEventListener('click', (e) => {
        if (e.target === markdownModal || e.target.querySelector('.bg-gray-500')) {
            // pass
        }
    });
    const mdBackdrop = markdownModal.querySelector('.bg-gray-500');
    if(mdBackdrop) {
        mdBackdrop.addEventListener('click', closeMd);
    }
}

function updateLogUI() {
    if (isLogExpanded) {
        logFooter.classList.remove('h-10');
        logFooter.classList.add('h-48');
        toggleLogBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">expand_more</span>';
    } else {
        logFooter.classList.remove('h-48');
        logFooter.classList.add('h-10');
        toggleLogBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">expand_less</span>';
    }
}

// --- Logging Logic ---

function addLog(type, message) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:mm:ss
    
    let colorClass = 'text-slate-700';
    let typeColorClass = 'text-blue-600';
    
    switch(type) {
        case 'INFO': typeColorClass = 'text-blue-600'; break;
        case 'WARN': typeColorClass = 'text-amber-600'; break;
        case 'ERROR': typeColorClass = 'text-red-600'; break;
        case 'SUCCESS': typeColorClass = 'text-emerald-600'; break;
        case 'TASK': typeColorClass = 'text-purple-600'; break;
    }

    const logItem = document.createElement('div');
    logItem.className = 'flex gap-2';
    logItem.innerHTML = `
        <span class="text-slate-400 shrink-0">[${timeStr}]</span>
        <span class="${typeColorClass} font-medium shrink-0">[${type}]</span>
        <span class="text-slate-700 break-all whitespace-pre-wrap">${message}</span>
    `;
    
    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Update header last msg
    lastLogMsg.textContent = message.split('\n')[0]; // Only show first line in header
}

// --- Settings Logic ---

async function openSettings() {
    await loadConfig();
    populateConfigForm();
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

async function loadConfig() {
    try {
        let content = await Neutralino.filesystem.readFile(CONFIG_FILE);
        configData = parseIni(content);
        console.log("Loaded config:", configData);
    } catch (err) {
        console.error("Failed to load config:", err);
        alert("读取配置文件失败，请检查 config.ini 是否存在。");
    }
}

function populateConfigForm() {
    if (!configData) return;

    // Helper to set value safely
    const setVal = (name, val) => {
        const el = configForm.elements[name];
        if (!el) return;
        
        if (el.type === 'checkbox') {
            el.checked = (val === 'True' || val === 'true');
        } else {
            // Handle quoted strings (remove backticks if present for display, though user asked to wrap them)
            // The prompt said: "User-Agent... 修改时请将尖括号及内部所有文本替换或删除，并确保值被反引号包裹。"
            // We will display raw values. If they have backticks, show them.
            el.value = val;
        }
    };

    // Network
    setVal('base_url', configData.network?.base_url || '');
    setVal('thread', configData.network?.thread || '2');
    setVal('ua', configData.network?.ua || '');
    setVal('ngaPassportUid', configData.network?.ngaPassportUid || '');
    setVal('ngaPassportCid', configData.network?.ngaPassportCid || '');

    // Post
    setVal('get_ip_location', configData.post?.get_ip_location || 'False');
    setVal('enhance_ori_reply', configData.post?.enhance_ori_reply || 'False');
    setVal('enhance_ori_reply_online', configData.post?.enhance_ori_reply_online || 'False');
    setVal('use_local_smile_pic', configData.post?.use_local_smile_pic || 'False');
    setVal('local_smile_pic_path', configData.post?.local_smile_pic_path || '');
    setVal('use_title_as_folder_name', configData.post?.use_title_as_folder_name || 'False');
    setVal('use_title_as_md_file_name', configData.post?.use_title_as_md_file_name || 'False');
    setVal('use_network_media_url', configData.post?.use_network_media_url || 'False');
    setVal('assets_path', configData.post?.assets_path || '');
    setVal('page_download_limit', configData.network?.page_download_limit || '100'); // Note: page_download_limit is in [network] section in sample
    setVal('split_md_file', configData.post?.split_md_file || '-1');
}

async function saveSettings() {
    // Gather data from form
    const formData = new FormData(configForm);
    
    // Update configData object
    // We need to preserve structure and comments if possible, but simple INI parser/dumper usually loses comments.
    // Given the requirement "读取outputs文件夹中config.ini文件的所有参数... 完成...可视化设计", 
    // we should try to write back safely.
    // For now, we will update the internal `configData` object and then stringify it.
    // Note: The user said "配置文件中的注释项...软件加载时会自动覆盖并删除", so maybe losing comments is fine?
    // "配置文件中的注释项不应用于记录信息，软件加载时会自动覆盖并删除。" -> This suggests the CLI tool rewrites it?
    // Let's just update the known keys.

    const updateKey = (section, key, value) => {
        if (!configData[section]) configData[section] = {};
        configData[section][key] = value;
    };

    const getVal = (name) => {
        const el = configForm.elements[name];
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked ? 'True' : 'False';
        return el.value;
    };

    // Network
    updateKey('network', 'base_url', getVal('base_url'));
    updateKey('network', 'thread', getVal('thread'));
    updateKey('network', 'ua', getVal('ua'));
    updateKey('network', 'ngaPassportUid', getVal('ngaPassportUid'));
    updateKey('network', 'ngaPassportCid', getVal('ngaPassportCid'));
    updateKey('network', 'page_download_limit', getVal('page_download_limit')); // Check if it belongs to network

    // Post
    updateKey('post', 'get_ip_location', getVal('get_ip_location'));
    updateKey('post', 'enhance_ori_reply', getVal('enhance_ori_reply'));
    updateKey('post', 'enhance_ori_reply_online', getVal('enhance_ori_reply_online'));
    updateKey('post', 'use_title_as_folder_name', getVal('use_title_as_folder_name'));
    updateKey('post', 'use_title_as_md_file_name', getVal('use_title_as_md_file_name'));
    updateKey('post', 'use_network_media_url', getVal('use_network_media_url'));
    updateKey('post', 'assets_path', getVal('assets_path'));
    updateKey('post', 'split_md_file', getVal('split_md_file'));

    try {
        const iniString = stringifyIni(configData);
        await Neutralino.filesystem.writeFile(CONFIG_FILE, iniString);
        console.log("Saved config");
        closeSettings();
        // Optional: Show success toast
        alert("配置保存成功！");
    } catch (err) {
        console.error("Failed to save config:", err);
        alert("保存配置失败: " + err.message);
    }
}

// --- INI Parser/Stringifier ---

function parseIni(str) {
    const result = {};
    let currentSection = null;

    const lines = str.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            currentSection = trimmed.substring(1, trimmed.length - 1);
            result[currentSection] = {};
        } else if (currentSection && trimmed.includes('=')) {
            const separatorIndex = trimmed.indexOf('=');
            const key = trimmed.substring(0, separatorIndex).trim();
            const value = trimmed.substring(separatorIndex + 1).trim();
            result[currentSection][key] = value;
        }
    }
    return result;
}

function stringifyIni(data) {
    let str = '';
    
    // Add version if exists in [config]
    if (data.config) {
        str += '[config]\n';
        for (const [key, val] of Object.entries(data.config)) {
            str += `${key}=${val}\n`;
        }
        str += '\n';
    }

    // Other sections
    for (const [section, content] of Object.entries(data)) {
        if (section === 'config') continue; // Already handled
        
        str += `[${section}]\n`;
        for (const [key, val] of Object.entries(content)) {
            str += `${key}=${val}\n`;
        }
        str += '\n';
    }
    return str;
}

// --- Logic ---

async function handleAddSubscription() {
    const url = urlInput.value.trim();
    if (!url) {
        // TODO: Show toast/alert
        console.warn("Empty URL");
        return;
    }
    
    const result = await addSubscription(url);
    if (result.success) {
        urlInput.value = ''; // Clear input
    }
}

// Reusable function to add subscription
async function addSubscription(url, fromArchive = false) {
    try {
        const parsed = parseNgaUrl(url);
        if (!parsed) {
            alert("无效的 NGA 链接，请检查格式。");
            return { success: false, reason: 'invalid_url' };
        }

        // Check for duplicates
        if (subscriptions.some(sub => sub.command === parsed.command)) {
            if (!fromArchive) {
                alert(`该任务已经在列表中了：\n${parsed.command}`);
            }
            return { success: false, reason: 'duplicate' };
        }

        const newSub = {
            id: crypto.randomUUID(),
            tid: parsed.tid,
            authorid: parsed.authorid,
            url: url,
            command: parsed.command,
            title: "等待获取...",
            author: parsed.authorid ? `ID:${parsed.authorid}` : "未知",
            last_updated: "-",
            added_at: Date.now()
        };

        subscriptions.unshift(newSub); // Add to top
        await saveSubscriptions();
        
        // Only render if we are not in archive view (or if we want to update the badge/list anyway)
        // But if fromArchive is true, we might not want to re-render the whole sub list immediately if it's hidden
        // However, updating badge is good.
        renderSubscriptions();

        console.log("Added subscription:", newSub);
        
        // Auto-update to fetch initial metadata
        if (window.runCommand) {
            // Don't await this if from archive to keep UI responsive? 
            // Or await it to show progress?
            // Let's await it but not block UI too much.
            window.runCommand(newSub.id);
        }
        
        return { success: true, id: newSub.id };
        
    } catch (error) {
        console.error("Error adding subscription:", error);
        if (!fromArchive) {
            alert("添加失败: " + error.message);
        }
        return { success: false, reason: 'error', message: error.message };
    }
}

function parseNgaUrl(url) {
    try {
        // Handle both standard URLs and potentially partial ones if needed
        // Pattern: tid=12345 or /read.php?tid=12345
        // &authorid=67890
        
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        const tid = params.get('tid');
        if (!tid) return null;

        const authorid = params.get('authorid');

        // Construct command
        // Case 1: ngapost2md 46046493 --authorid 61765516
        // Case 2: ngapost2md 46046493
        let command = `ngapost2md ${tid}`;
        if (authorid) {
            command += ` --authorid ${authorid}`;
        }

        return {
            tid,
            authorid,
            command
        };

    } catch (e) {
        console.error("URL Parse Error:", e);
        return null;
    }
}

// --- Data Persistence ---

async function loadSubscriptions() {
    try {
        // Read file using Neutralino filesystem API
        // Note: Neutralino.filesystem.readFile reads text
        let content = await Neutralino.filesystem.readFile(DATA_FILE);
        subscriptions = JSON.parse(content);
        console.log("Loaded subscriptions:", subscriptions.length);
    } catch (err) {
        // If file doesn't exist or error, start empty
        console.warn("Could not load subscriptions (first run?):", err);
        subscriptions = [];
        // Try to create the file if it doesn't exist
        if (err.code === 'NE_FS_FILRER') {
             await saveSubscriptions();
        }
    }
}

async function saveSubscriptions() {
    try {
        await Neutralino.filesystem.writeFile(DATA_FILE, JSON.stringify(subscriptions, null, 2));
        console.log("Saved subscriptions");
    } catch (err) {
        console.error("Failed to save subscriptions:", err);
        alert("保存数据失败!");
    }
}

// --- Scheduler & Queue Logic ---

function scheduler() {
    const now = Date.now();
    
    // 1. Check for due subscriptions
    const dueSubs = subscriptions.filter(sub => {
        return sub.autoUpdate && 
               sub.autoUpdate !== 'off' && 
               sub.nextUpdateTime && 
               sub.nextUpdateTime <= now &&
               !updateQueue.includes(sub.id) &&
               sub.id !== updatingId;
    });
    
    // 2. Add to queue
    dueSubs.forEach(sub => {
        updateQueue.push(sub.id);
    });
    
    // 3. Process Queue
    processQueue();
}

async function processQueue() {
    if (isProcessingQueue || updateQueue.length === 0) return;
    
    isProcessingQueue = true;
    const subId = updateQueue.shift(); // FIFO
    
    try {
        await executeSubscriptionUpdate(subId, false); // false = not manual
    } catch (e) {
        console.error("Queue execution error:", e);
    } finally {
        isProcessingQueue = false;
        // Process next immediately
        processQueue();
    }
}

function calculateNextUpdate(scheduleType) {
    const now = Date.now();
    let intervalMs = 0;
    
    switch(scheduleType) {
        case '1m': intervalMs = 60 * 1000; break;
        case '5m': intervalMs = 5 * 60 * 1000; break;
        case '10m': intervalMs = 10 * 60 * 1000; break;
        case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
        default: return null;
    }
    
    // Add jitter: +/- 10 seconds (random between -10000 and 10000)
    const jitter = Math.floor(Math.random() * 20000) - 10000;
    
    return now + intervalMs + jitter;
}

async function toggleSchedule(id, type) {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    
    // Check limit if turning on
    if (type !== 'off') {
        const activeCount = subscriptions.filter(s => s.autoUpdate && s.autoUpdate !== 'off').length;
        // If we are changing from off to on, and count >= 5
        if ((!sub.autoUpdate || sub.autoUpdate === 'off') && activeCount >= 5) {
            await showMessage('限制提醒', '最多只能同时启用 5 个自动更新任务。', 'warning');
            return;
        }
    }
    
    sub.autoUpdate = type;
    
    if (type === 'off') {
        sub.nextUpdateTime = null;
        addLog('INFO', `已取消订阅 "${sub.title}" 的自动更新`);
    } else {
        sub.nextUpdateTime = calculateNextUpdate(type);
        const nextDate = new Date(sub.nextUpdateTime).toLocaleTimeString();
        addLog('INFO', `已设置订阅 "${sub.title}" 自动更新: ${getScheduleLabel(type)} (下次: ${nextDate})`);
    }
    
    await saveSubscriptions();
    renderSubscriptions();
}

function getScheduleLabel(type) {
    switch(type) {
        case '1m': return '1分钟';
        case '5m': return '5分钟';
        case '10m': return '10分钟';
        case '1d': return '1天';
        default: return '禁止自动更新';
    }
}

function startGlobalCooldown() {
    isGlobalCooldown = true;
    cooldownSeconds = 10;
    
    // Clear existing timer if any
    if (cooldownTimer) clearInterval(cooldownTimer);
    
    renderSubscriptions(); // Initial render
    
    cooldownTimer = setInterval(() => {
        cooldownSeconds--;
        if (cooldownSeconds <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            isGlobalCooldown = false;
        }
        renderSubscriptions();
    }, 1000);
}

// --- UI Rendering ---

function renderSubscriptions() {
    subscriptionTableBody.innerHTML = '';
    
    // Filter logic
    const searchTerm = searchInput.value.trim().toLowerCase();
    let filteredSubscriptions = subscriptions;
    
    // 1. Filter by Active Only if enabled
    if (showActiveOnly) {
        filteredSubscriptions = filteredSubscriptions.filter(s => s.autoUpdate && s.autoUpdate !== 'off');
    }

    // 2. Filter by Search Term
    if (searchTerm) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => {
            return (sub.tid && sub.tid.toString().includes(searchTerm)) ||
                   (sub.title && sub.title.toLowerCase().includes(searchTerm)) ||
                   (sub.author && sub.author.toLowerCase().includes(searchTerm)) ||
                   (sub.command && sub.command.toLowerCase().includes(searchTerm));
        });
    }

    const totalItems = filteredSubscriptions.length;
    
    // Calculate Active Auto-Updates
    const activeCount = subscriptions.filter(s => s.autoUpdate && s.autoUpdate !== 'off').length;
    const activeBadge = document.getElementById('activeCountBadge'); // Use ID now
    if (activeBadge) {
        activeBadge.textContent = `${activeCount} 个活跃的自动更新计划`;
        
        // Highlight badge if filter is active
        if (showActiveOnly) {
             activeBadge.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
             activeBadge.title = "点击显示所有任务";
        } else {
             activeBadge.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
             activeBadge.title = "点击仅显示活跃任务";
        }
    }
    
    // Update Filter Button State
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        if (showActiveOnly) {
             filterBtn.classList.add('text-primary', 'bg-primary/10');
             filterBtn.classList.remove('text-slate-500', 'hover:bg-slate-100');
             // filterBtn.querySelector('span').textContent = 'filter_alt'; // Optional icon change
             filterBtn.title = "显示所有任务";
        } else {
             filterBtn.classList.remove('text-primary', 'bg-primary/10');
             filterBtn.classList.add('text-slate-500', 'hover:bg-slate-100');
             // filterBtn.querySelector('span').textContent = 'filter_list';
             filterBtn.title = "筛选活跃任务";
        }
    }

    // Pagination Logic
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentSlice = filteredSubscriptions.slice(startIndex, endIndex);

    // Update Pagination UI
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (totalItems > 0 || searchTerm) {
        paginationContainer.classList.remove('hidden');
        document.getElementById('paginationInfo').innerHTML = `
            显示第 <span class="font-medium text-slate-900">${totalItems > 0 ? startIndex + 1 : 0}</span> 到 <span class="font-medium text-slate-900">${endIndex}</span> 条，共 <span class="font-medium text-slate-900">${totalItems}</span> 条结果
            ${searchTerm ? `<span class="text-xs text-slate-400 ml-2">(过滤自 ${subscriptions.length} 条)</span>` : ''}
        `;
        
        let navHtml = '';
        navHtml += `
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-slate-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">上一页</span>
                <span class="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span class="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                ${currentPage} / ${totalPages || 1}
            </span>
            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages || totalItems === 0 ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-slate-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">下一页</span>
                <span class="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
        `;
        document.getElementById('paginationNav').innerHTML = navHtml;
        document.getElementById('paginationMobile').innerHTML = `
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:opacity-50">上一页</button>
            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages || totalItems === 0 ? 'disabled' : ''} class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:opacity-50">下一页</button>
        `;
    } else {
        paginationContainer.classList.add('hidden');
    }

    if (totalItems === 0) {
        if (searchTerm) {
             subscriptionTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-slate-500">
                        未找到匹配 "${searchTerm}" 的订阅。
                    </td>
                </tr>
            `;
        } else {
            subscriptionTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-slate-500">
                        暂无订阅，请在上方添加 NGA 帖子链接，或者在订阅列表中设置自动更新计划任务。
                    </td>
                </tr>
            `;
        }
        return;
    }

    currentSlice.forEach(sub => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors group';
        
        const scheduleLabel = sub.autoUpdate && sub.autoUpdate !== 'off' ? getScheduleLabel(sub.autoUpdate) : '计划任务';
        
        // Determine button state
        const isUpdating = sub.id === updatingId;
        const updateDisabled = (isGlobalCooldown || isUpdating) ? 'disabled' : '';

        const btnBaseClass = "inline-flex items-center justify-center w-9 h-9 rounded-md border transition-all";
        
        let updateBtnContent = '<span class="material-symbols-outlined text-[20px]">play_arrow</span>';
        let updateBtnClass = `${btnBaseClass} border-slate-200 text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5`;
        
        if (isUpdating) {
            updateBtnContent = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span>';
            updateBtnClass = `${btnBaseClass} border-primary text-primary bg-primary/5 cursor-not-allowed`;
        } else if (isGlobalCooldown) {
            updateBtnContent = `<span class="text-xs font-mono font-bold w-[20px] inline-block text-center">${cooldownSeconds}</span>`;
            updateBtnClass = `${btnBaseClass} border-slate-200 text-slate-300 cursor-not-allowed`;
        }

        // Title logic: append (只看楼主) if authorid exists
        let displayTitle = sub.title || sub.command;
        if (sub.authorid) {
            displayTitle += ` <span class="text-xs text-slate-400 font-normal">(只看楼主: ${sub.authorid})</span>`;
        }

        row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                <a href="#" onclick="Neutralino.os.open('${sub.url}'); return false;" class="hover:text-primary hover:underline" title="在新窗口打开原帖">${sub.tid}</a>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <a href="#" onclick="openMarkdownViewer('${sub.id}'); return false;" class="text-sm font-medium text-slate-900 hover:text-primary line-clamp-1" title="点击阅读存档">${displayTitle}</a>
                    <span class="text-xs text-slate-500 mt-0.5 line-clamp-1 code-snippet" title="${sub.command}">${sub.command}</span>
                </div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-slate-500">
                <div class="flex items-center gap-2">
                    ${sub.author}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                <div class="flex items-center gap-2">
                    ${sub.latestProgress ? `
                        <span class="text-xs ${sub.hasNewContent ? 'text-green-600' : 'text-slate-700'}">${sub.latestProgress.max_page}页</span>
                        <span class="text-xs ${sub.hasNewContent ? 'text-green-600' : 'text-slate-700'}">${sub.latestProgress.max_floor}楼</span>
                        <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-600 border border-green-200 ${sub.hasNewContent ? '' : 'invisible'}">NEW</span>
                    ` : '<span class="text-xs text-slate-400">-</span>'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                <div class="flex flex-col items-end">
                    <span>${sub.last_updated}</span>
                    ${sub.nextUpdateTime ? `<span class="text-xs text-orange-500" title="下次更新时间">Next: ${new Date(sub.nextUpdateTime).toLocaleTimeString()}</span>` : ''}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2 relative">
                    <button onclick="openSubscriptionFolder('${sub.id}')" class="${btnBaseClass} border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-600 hover:bg-amber-50" title="打开文件夹">
                        <span class="material-symbols-outlined text-[20px]">folder_open</span>
                    </button>
                    
                    <button id="schedule-btn-${sub.id}" onclick="toggleScheduleDropdown('${sub.id}', event)" class="${btnBaseClass} border-slate-200 ${sub.autoUpdate && sub.autoUpdate !== 'off' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-slate-400 hover:text-orange-500 hover:border-orange-500 hover:bg-orange-50'}" title="${scheduleLabel}">
                        <span class="material-symbols-outlined text-[20px]">schedule</span>
                    </button>

                    <button onclick="runCommand('${sub.id}')" id="btn-${sub.id}" ${updateDisabled} class="${updateBtnClass}" title="立即更新">
                        ${updateBtnContent}
                    </button>
                    <button onclick="removeSubscription('${sub.id}')" class="${btnBaseClass} border-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200" title="删除订阅">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </td>
        `;
        subscriptionTableBody.appendChild(row);
    });
}

// Dropdown helpers (Global Portal Version)
window.toggleScheduleDropdown = (id, event) => {
    if (event) {
        event.stopPropagation();
    }
    
    // If clicking the same button, close it
    if (activeDropdownId === id) {
        closeGlobalDropdown();
        return;
    }
    
    activeDropdownId = id;
    
    // Find button and sub
    const btn = document.getElementById(`schedule-btn-${id}`);
    const sub = subscriptions.find(s => s.id === id);
    if (!btn || !sub) return;
    
    // Get or Create Portal
    let portal = document.getElementById('global-dropdown-portal');
    if (!portal) {
        portal = document.createElement('div');
        portal.id = 'global-dropdown-portal';
        portal.className = 'fixed z-50 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none rounded-md w-40 hidden';
        document.body.appendChild(portal);
    }
    
    // Position
    const rect = btn.getBoundingClientRect();
    
    // Default: show below, aligned right
    // Using fixed positioning, coordinates are relative to viewport
    portal.style.top = `${rect.bottom + 5}px`;
    portal.style.left = `${rect.right - 160}px`; // 160px is approx width
    
    // Content
    const getOptionClass = (type) => {
        const isActive = (type === 'off' && (!sub.autoUpdate || sub.autoUpdate === 'off')) || (sub.autoUpdate === type);
        return `block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isActive ? 'bg-gray-50 font-bold' : ''}`;
    };
    
    portal.innerHTML = `
        <div class="py-1">
            <button onclick="toggleSchedule('${sub.id}', 'off'); closeGlobalDropdown()" class="${getOptionClass('off')}">禁止自动更新</button>
            <button onclick="toggleSchedule('${sub.id}', '1m'); closeGlobalDropdown()" class="${getOptionClass('1m')}">每 1 分钟</button>
            <button onclick="toggleSchedule('${sub.id}', '5m'); closeGlobalDropdown()" class="${getOptionClass('5m')}">每 5 分钟</button>
            <button onclick="toggleSchedule('${sub.id}', '10m'); closeGlobalDropdown()" class="${getOptionClass('10m')}">每 10 分钟</button>
            <button onclick="toggleSchedule('${sub.id}', '1d'); closeGlobalDropdown()" class="${getOptionClass('1d')}">每 1 天</button>
        </div>
    `;
    
    portal.classList.remove('hidden');
};

window.closeGlobalDropdown = () => {
    const portal = document.getElementById('global-dropdown-portal');
    if (portal) {
        portal.classList.add('hidden');
    }
    activeDropdownId = null;
};

// Global click to close dropdowns
window.addEventListener('click', (e) => {
    // If click is inside portal, don't close
    if (e.target.closest('#global-dropdown-portal')) return;
    
    // If click is on the toggle button, it is handled by the button's click handler (stopPropagation)
    // So this global handler catches clicks everywhere else.
    closeGlobalDropdown();
});

// Close on scroll to avoid detached dropdowns
window.addEventListener('scroll', () => {
    closeGlobalDropdown();
}, true);

window.changePage = (page) => {
    currentPage = page;
    renderSubscriptions();
};

window.openUrl = async (url) => {
    await Neutralino.os.open(url);
};

// Global functions for inline onclick handlers
window.removeSubscription = async (id) => {
    if(!await window.showConfirm("确定要删除这个订阅吗？")) return;
    subscriptions = subscriptions.filter(s => s.id !== id);
    await saveSubscriptions();
    renderSubscriptions();
};

window.executeSubscriptionUpdate = async (id, isManual = false) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    // Trigger cooldown for all updates (manual or auto)
    startGlobalCooldown();

    updatingId = id;
    renderSubscriptions(); // Show spinner

    addLog('TASK', `${isManual ? '手动' : '自动'}更新任务: ${sub.title || sub.command}`);

    try {
        if (!configData.post) {
            await loadConfig();
        }

        sub.saved_options = {
            use_title_as_folder_name: configData.post?.use_title_as_folder_name === 'True',
            use_title_as_md_file_name: configData.post?.use_title_as_md_file_name === 'True'
        };

        const args = sub.command.replace(/^ngapost2md\s+/, '');
        const cmd = `cd outputs && ngapost2md.exe ${args}`;

        addLog('INFO', `执行指令: ${cmd}`);
        console.log("Executing:", cmd);

        let result = await Neutralino.os.execCommand(cmd);
        console.log("Result:", result);

        if (result.exitCode === 0) {
            addLog('SUCCESS', `任务完成 (Exit: 0)`);
            const outputText = result.output ? result.output.trim() : '';
            if (outputText) {
                addLog('INFO', outputText);
            }

            sub.last_updated = new Date().toLocaleString();

            const foundPath = await findDownloadedFile(sub.tid, sub.authorid, sub.saved_options);

            if (foundPath) {
                sub.local_path = foundPath.replace(/\\/g, '/');
                addLog('INFO', `定位到存档文件: ${sub.local_path}`);

                try {
                    // 0. Try to use MD filename as title if current title is weak (pure digits)
                    // Extract filename from local_path
                    const mdFileName = sub.local_path.split('/').pop().replace(/\.md$/i, '');
                    if (mdFileName.toLowerCase() !== 'readme' && mdFileName.toLowerCase() !== 'post' && !mdFileName.includes(sub.tid)) {
                         // Check if current title is weak (pure digits/symbols) OR corrupted (starts with <span) OR is placeholder
                        if (/^[\d\s\(\)\-]+$/.test(sub.title) || sub.title.startsWith('<span') || sub.title.includes('等待获取')) {
                            sub.title = mdFileName;
                        }
                   }

                   let mdContent = await Neutralino.filesystem.readFile(sub.local_path);
                   const lines = mdContent.split(/\r?\n/).slice(0, 100);

                   // 1. Try to find Title
                   for (const line of lines) {
                       const trimmed = line.trim();
                       const titleMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
                       if (titleMatch) {
                           const extractedText = titleMatch[2].trim();
                            // Ignore if it looks like a floor header (starts with <span or contains id="pid")
                            if (extractedText.startsWith('<span') || extractedText.includes('id="pid"')) {
                                continue;
                            }

                            // Only overwrite if current title is effectively just IDs (numbers and parens) OR corrupted OR is placeholder
                            if (/^[\d\s\(\)\-]+$/.test(sub.title) || sub.title.startsWith('<span') || sub.title.includes('等待获取')) {
                                sub.title = extractedText;
                            }
                           break; 
                       }
                   }

                    const pid0Match = mdContent.match(/<span id="pid0">.*?by\s+(.+?)\(\d+\)/);
                    if (pid0Match) {
                        sub.author = pid0Match[1].trim();
                    } else {
                        const fallbackMatch = mdContent.match(/by\s+(.+?)\(\d+\)/);
                        if (fallbackMatch) {
                            sub.author = fallbackMatch[1].trim();
                        }
                    }
                    
                    // Read process.ini for progress
                    try {
                        const processIniPath = sub.local_path.replace(/[^\/]+$/, 'process.ini');
                        const iniContent = await Neutralino.filesystem.readFile(processIniPath);
                        
                        // Parse ini
                        const maxFloorMatch = iniContent.match(/max_floor=(\d+)/);
                        const maxPageMatch = iniContent.match(/max_page=(\d+)/);
                        
                        if (maxFloorMatch && maxPageMatch) {
                            const newMaxFloor = parseInt(maxFloorMatch[1], 10);
                            const newMaxPage = parseInt(maxPageMatch[1], 10);

                            // Check for updates
                            const oldMaxFloor = sub.latestProgress ? sub.latestProgress.max_floor : 0;
                            if (newMaxFloor > oldMaxFloor) {
                                sub.hasNewContent = true;
                            }

                            sub.latestProgress = {
                                max_floor: newMaxFloor,
                                max_page: newMaxPage
                            };
                            addLog('INFO', `更新进度: ${sub.latestProgress.max_page}页 / ${sub.latestProgress.max_floor}楼`);
                        }
                    } catch (iniErr) {
                         // process.ini might not exist or be readable, which is fine
                         // console.warn("Could not read process.ini:", iniErr);
                    }

                } catch (readErr) {
                    console.warn("Failed to read generated file for metadata:", readErr);
                    addLog('WARN', `无法读取生成的文件以更新元数据: ${readErr.message}`);
                }
            } else {
                addLog('WARN', "无法自动定位存档文件，请检查 outputs 目录。");
            }

            // Schedule next update if auto-update is on
            if (sub.autoUpdate && sub.autoUpdate !== 'off') {
                sub.nextUpdateTime = calculateNextUpdate(sub.autoUpdate);
                addLog('INFO', `计划下次更新: ${new Date(sub.nextUpdateTime).toLocaleTimeString()}`);
            }

            await saveSubscriptions();
            
        } else {
            addLog('ERROR', `任务失败 (Code: ${result.exitCode})`);
            if (result.error) addLog('ERROR', result.error.trim());
            if (result.output) addLog('INFO', `Output: ${result.output.trim()}`);
            
            if (isManual) {
                alert(`更新失败 (Code: ${result.exitCode})\n${result.error || result.output}`);
            }
        }
    } catch (e) {
        console.error("Execution error:", e);
        addLog('ERROR', `执行异常: ${e.message}`);
        if (isManual) {
            alert("执行出错: " + e.message);
        }
    } finally {
        updatingId = null;
        renderSubscriptions(); // Restore button state
    }
};

window.runCommand = async (id) => {
    await executeSubscriptionUpdate(id, true);
};

window.openSubscriptionFolder = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    
    if (sub.local_path) {
        // We have a path, open its folder
        // Neutralino showInFolder takes a file path and selects it, or folder path
        try {
            // Convert to appropriate separator for OS if needed, but usually Neutralino handles it.
            // On Windows, showInFolder works with file paths usually.
            await Neutralino.os.showInFolder(sub.local_path);
        } catch (e) {
            alert("打开文件夹失败: " + e.message);
        }
    } else {
        alert("未找到本地路径信息。请先运行‘更新’任务以获取最新路径。");
    }
};

// Helper: Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper: Load Local Image Data
const loadLocalImageData = async (path) => {
    const data = await Neutralino.filesystem.readBinaryFile(path);
    const base64 = arrayBufferToBase64(data);
    const ext = path.split('.').pop().toLowerCase();
    let mime = 'image/jpeg';
    if (ext === 'png') mime = 'image/png';
    else if (ext === 'gif') mime = 'image/gif';
    else if (ext === 'webp') mime = 'image/webp';
    else if (ext === 'svg') mime = 'image/svg+xml';
    return `data:${mime};base64,${base64}`;
};

window.openLocalMarkdownFile = async (filePath, title, subtitle) => {
    if (!filePath) {
        alert("未找到本地文件路径，请先刷新或检查文件是否存在。");
        return;
    }

    // Lock body scroll to prevent main interface scrolling
    document.body.style.overflow = 'hidden';

    // UI Reset
    mdModalTitle.textContent = title || '帖子存档';
    mdModalSubtitle.textContent = subtitle || filePath;
    const mdContentContainer = document.getElementById('mdContentContainer');
    if(mdContentContainer) mdContentContainer.scrollTop = 0;
    
    // Initial loading state
    mdContent.innerHTML = '<div class="flex flex-col items-center justify-center p-10 gap-3"><span class="loading loading-spinner loading-lg text-primary"></span><span class="text-slate-500">正在加载文档...</span></div>';
    
    const modal = document.getElementById('markdownModal');
    if (modal) modal.classList.remove('hidden');

    // Reset State
    currentLightboxImages = []; // Global lightbox list
    const seenImages = new Set(); // To filter duplicates in lightbox
    
    // Helper to update "View All Images" button
    const updateViewAllBtn = (loading = false) => {
        if (!viewAllImagesBtn) return;
        
        let countText = `(${currentLightboxImages.length} 张)`;
        if (loading) countText = `(加载中... ${currentLightboxImages.length} 张)`;
        
        if (currentLightboxImages.length > 0 || loading) {
            viewAllImagesBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            viewAllImagesBtn.disabled = false;
            viewAllImagesBtn.title = `浏览全部图片 ${countText}`;
            // If loading, maybe show a spinner icon? For now text is enough.
            viewAllImagesBtn.innerHTML = `<span class="material-symbols-outlined mr-1 text-[18px]">collections</span>${loading ? '加载中...' : '全部图片'} <span class="text-xs ml-1">${currentLightboxImages.length}</span>`;
        } else {
            viewAllImagesBtn.classList.add('opacity-50', 'cursor-not-allowed');
            viewAllImagesBtn.disabled = true;
            viewAllImagesBtn.title = '当前文档没有可浏览的图片';
            viewAllImagesBtn.innerHTML = `<span class="material-symbols-outlined mr-1 text-[18px]">collections</span>全部图片`;
        }
    };
    updateViewAllBtn(); // Reset button

    // Helper: Load Lazy Image
    const loadLazyImage = async (img) => {
        if (img.dataset.loaded === 'true') return;
        const relPath = img.getAttribute('data-original-src');
        if (!relPath) return;
        
        try {
            const finalSrc = await loadLocalImageData(relPath);
            img.src = finalSrc;
            img.dataset.loaded = 'true';
            img.classList.remove('lazy-load-img', 'bg-gray-50', 'min-h-[50px]');
            img.style.cursor = 'zoom-in';

            // Update lightbox entry if exists
            const entry = currentLightboxImages.find(item => item.path === relPath);
            if (entry) {
                entry.src = finalSrc;
            }
        } catch (e) {
            console.error("Failed to load image:", relPath, e);
            img.alt = `(加载失败) ${img.alt}`;
            img.classList.add('border-red-200', 'bg-red-50');
        }
    };

    // IntersectionObserver for Lazy Loading
    const lazyImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadLazyImage(img);
                observer.unobserve(img);
            }
        });
    }, { 
        root: mdContentContainer, // Use the scroll container as root
        rootMargin: '500px 0px 500px 0px' // Preload 500px before/after
    });

    try {
        // 1. Read File
        let content = await Neutralino.filesystem.readFile(filePath);
        
        // 2. Prepare Chunks
        // Split by NGA floor marker (##### )
        // Use lookahead to keep delimiter
        let chunks = content.split(/(?=^##### )/gm);
        if (chunks.length === 0) chunks = [content];
        
        mdContent.innerHTML = ''; // Clear loading spinner
        // Clear footer progress
        const footerProgress = document.getElementById('mdLoadingProgress');
        if (footerProgress) footerProgress.innerHTML = '';
        
        let currentChunkIndex = 0;
        const CHUNK_SIZE = 50; // Render 50 floors per batch
        let isRenderingBatch = false;
        let autoLoadTimer = null;
        
        // Helper: Open Lightbox by Path
        const openLightboxByPath = (path) => {
            const idx = currentLightboxImages.findIndex(img => img.path === path || img.src === path);
            if (idx !== -1) openLightbox(idx);
        };

        // Helper: Render Chunk Text
        const renderChunkText = async (text) => {
            // Clean headers and pid tags
            let cleanTxt = text.replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
                               .replace(/<pid:[^>]*>/g, '')
                               .replace(/^##### (.*?)$/gm, '##### $1');
            
            // Transform images to Lazy Load tags
            // ![alt](url) -> <img data-original-src="...">
            cleanTxt = cleanTxt.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
                url = url.replace(/\\/g, '/');
                // Check if local relative path
                if (!url.match(/^(http|https|file|data):/) && !url.startsWith('/')) {
                     const mdDir = filePath.substring(0, filePath.lastIndexOf('/'));
                     const imagePath = mdDir + '/' + url;
                     // Return HTML for marked to pass through
                     // Use a transparent svg placeholder
                     return `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjwvc3ZnPg==" data-original-src="${imagePath}" alt="${alt}" class="lazy-load-img max-w-full h-auto rounded-lg my-2 min-h-[50px] bg-gray-50 transition-opacity duration-300" />`;
                }
                return match; // External images
            });

            // Render Markdown
            if (typeof marked !== 'undefined') {
                return marked.parse(cleanTxt);
            } else {
                return simpleMarkdownRender(cleanTxt);
            }
        };

        // Function to append next batch
        const appendNextBatch = async (isAuto = false) => {
            if (isRenderingBatch) return;
            const loadingProgress = document.getElementById('mdLoadingProgress');

            if (currentChunkIndex >= chunks.length) {
                // Done
                if (document.getElementById('scroll-sentinel')) document.getElementById('scroll-sentinel').remove();
                if (loadingProgress) loadingProgress.innerHTML = ''; // Clear progress
                
                const endMsg = document.createElement('div');
                endMsg.className = 'py-8 text-center text-slate-300 text-xs italic';
                endMsg.innerText = '--- 全文完 ---';
                if (!mdContent.innerText.includes('--- 全文完 ---')) mdContent.appendChild(endMsg);
                generateTOC();
                updateViewAllBtn(false); // Final update
                return;
            }

            isRenderingBatch = true;
            // Update button to loading state with count
            updateViewAllBtn(true);
            
            // Update Progress Bar
            if (loadingProgress) {
                const progress = Math.round((currentChunkIndex / chunks.length) * 100);
                loadingProgress.innerHTML = `<span class="loading loading-spinner loading-xs mr-2"></span>正在加载剩余楼层 (${progress}%)...`;
            }

            try {
                const batch = chunks.slice(currentChunkIndex, currentChunkIndex + CHUNK_SIZE);
                if (batch.length === 0) {
                    isRenderingBatch = false;
                    return;
                }
                
                currentChunkIndex += CHUNK_SIZE;
                
                // Join and Render
                const html = await renderChunkText(batch.join(''));
                
                // Create container for this batch to avoid full re-layout
                const batchContainer = document.createElement('div');
                batchContainer.innerHTML = html;
                mdContent.appendChild(batchContainer);
                
                // Post-process new elements
                
                // 1. External Links
                const links = batchContainer.querySelectorAll('a');
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        link.onclick = (e) => {
                            e.preventDefault();
                            Neutralino.os.open(href);
                        };
                    }
                });
                
                // 2. Images (Lazy + Lightbox)
                const imgs = batchContainer.querySelectorAll('img');
                imgs.forEach(img => {
                    if (img.src.includes('/smile/')) return;
                    
                    const isLazy = img.classList.contains('lazy-load-img');
                    
                    // Unified Lightbox Registration
                    // For local: use data-original-src (path). For external: use src.
                    const uniqueKey = isLazy ? img.getAttribute('data-original-src') : img.src;
                    
                    if (uniqueKey && !seenImages.has(uniqueKey)) {
                        seenImages.add(uniqueKey);
                        currentLightboxImages.push({
                            type: isLazy ? 'local' : 'external',
                            path: isLazy ? uniqueKey : null,
                            src: isLazy ? null : uniqueKey, // Local starts null
                            alt: img.alt
                        });
                    }

                    // If lazy, observe it
                    if (isLazy) {
                        lazyImageObserver.observe(img);
                    }
                    
                    // Click handler for ALL images
                    img.style.cursor = 'zoom-in';
                    img.onclick = (e) => {
                        e.stopPropagation();
                        // If lazy and not loaded, force load
                        if (isLazy && img.dataset.loaded !== 'true') {
                             loadLazyImage(img).then(() => {
                                 // Use path for local lookup
                                 openLightboxByPath(uniqueKey);
                             });
                        } else {
                            openLightboxByPath(uniqueKey);
                        }
                    };
                });
                
                // Generate/Update TOC
                if (currentChunkIndex % (CHUNK_SIZE * 2) === 0 || currentChunkIndex >= chunks.length) {
                     generateTOC();
                }

                // Sentinel for Infinite Scroll
                const oldSentinel = document.getElementById('scroll-sentinel');
                if (oldSentinel) oldSentinel.remove();
                
                if (currentChunkIndex < chunks.length) {
                    const sentinel = document.createElement('div');
                    sentinel.id = 'scroll-sentinel';
                    // Invisible target for intersection observer
                    sentinel.className = 'h-10 w-full opacity-0 pointer-events-none';
                    mdContent.appendChild(sentinel);
                    
                    const sentinelObserver = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting) {
                            sentinelObserver.disconnect();
                            if (autoLoadTimer) clearTimeout(autoLoadTimer);
                            appendNextBatch(); 
                        }
                    }, { root: mdContentContainer, rootMargin: '200px' });
                    
                    sentinelObserver.observe(sentinel);
                    
                    // AUTO LOAD NEXT BATCH
                    autoLoadTimer = setTimeout(() => {
                        appendNextBatch(true);
                    }, 100);
                } else {
                    // Final wrap up
                    const endMsg = document.createElement('div');
                    endMsg.className = 'py-8 text-center text-slate-300 text-xs italic';
                    endMsg.innerText = '--- 全文完 ---';
                    mdContent.appendChild(endMsg);
                    generateTOC(); 
                    updateViewAllBtn(false);
                    if (loadingProgress) loadingProgress.innerHTML = ''; // Ensure clear
                }
            } catch (e) {
                console.error("Batch render error:", e);
            } finally {
                isRenderingBatch = false;
            }
        };
        
        // Initial Batch
        await appendNextBatch();
        
        // Try to load marked if missing (Optional optimization for future)
        if (typeof marked === 'undefined' && !document.querySelector('script[src*="marked.min.js"]')) {
             const script = document.createElement('script');
             script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
             document.head.appendChild(script);
        }
        
    } catch (e) {
        console.error("Read MD failed:", e);
        addLog('ERROR', `读取存档文件失败: ${e.message}`);
        mdContent.innerHTML = `<div class="text-red-500 p-4">读取文件失败: ${e.message}</div>`;
    }
    
    // Setup Refresh Button
    const refreshBtn = document.getElementById('refreshMdBtn');
    if (refreshBtn) {
        refreshBtn.onclick = async () => {
            await window.openLocalMarkdownFile(filePath, title, subtitle);
        };
    }

    // Setup "Open with default app" button
    const openExtBtn = document.getElementById('openExternalBtn');
    if (openExtBtn) {
        openExtBtn.onclick = async () => {
            let absPath = NL_CWD + '/' + filePath;
            absPath = absPath.replace(/\//g, '\\');
            try {
                await Neutralino.os.open(absPath);
            } catch(e) {
                alert("打开失败: " + e.message);
            }
        };
    }
    
    // Setup Fix Image Button
    if (fixImageLinksBtn) {
        fixImageLinksBtn.onclick = async () => {
            if(!await window.showConfirm("确定要修复文档中的图片链接斜杠错误吗？\n这会修改本地文件。")) return;
            try {
                let content = await Neutralino.filesystem.readFile(filePath);
                let fixedContent = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
                    const fixedUrl = url.replace(/\\/g, '/');
                    return `![${alt}](${fixedUrl})`;
                });
                
                if (fixedContent !== content) {
                    await Neutralino.filesystem.writeFile(filePath, fixedContent);
                    addLog('SUCCESS', `已修复图片链接: ${title}`);
                    alert("修复完成！正在重新加载...");
                    await window.openLocalMarkdownFile(filePath, title, subtitle);
                } else {
                    alert("未发现需要修复的链接。");
                }
            } catch(e) {
                alert("修复失败: " + e.message);
            }
        };
    }

    // Setup Floating Buttons
    const floatBtns = document.getElementById('mdFloatingBtns');
    const scrollTopBtn = document.getElementById('mdScrollTopBtn');
    const scrollBottomBtn = document.getElementById('mdScrollBottomBtn');
    const mdModal = document.getElementById('mdModal');

    if (floatBtns && mdContentContainer) {
        // Reset state
        floatBtns.classList.add('opacity-0', 'pointer-events-none');
        
        // Ensure buttons are hidden when modal is hidden (CSS handles this if inside modal, but good to be safe)
        // Check visibility
        const checkVisibility = () => {
             // Show only if:
             // 1. Modal is open (handled by parent visibility)
             // 2. Content is scrollable (scrollHeight > clientHeight)
             // 3. User has scrolled a bit? Or always show if scrollable?
             // User said: "只在阅读器打开时显示" - handled by DOM structure inside modal
             // User said: "正文区域右侧居中" - handled by fixed positioning with CSS tweaks
             
             if (mdContentContainer.scrollHeight > mdContentContainer.clientHeight) {
                 floatBtns.classList.remove('opacity-0', 'pointer-events-none');
             } else {
                 floatBtns.classList.add('opacity-0', 'pointer-events-none');
             }
        };

        // Update on scroll
        const handleScroll = () => {
            // Always show if scrollable, maybe fade out if idle?
            // User requirement: "只针对md阅读正文区域有效"
            if (mdContentContainer.scrollHeight > mdContentContainer.clientHeight) {
                 floatBtns.classList.remove('opacity-0', 'pointer-events-none');
            }
        };
        
        // Update on resize or content change
        const resizeObserver = new ResizeObserver(() => {
            checkVisibility();
        });
        resizeObserver.observe(mdContentContainer);
        resizeObserver.observe(mdContent);

        mdContentContainer.removeEventListener('scroll', handleScroll); 
        mdContentContainer.addEventListener('scroll', handleScroll);
        
        // Initial check
        setTimeout(checkVisibility, 500); // Wait for render

        if (scrollTopBtn) {
            scrollTopBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                mdContentContainer.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }

        if (scrollBottomBtn) {
            scrollBottomBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                mdContentContainer.scrollTo({ top: mdContentContainer.scrollHeight, behavior: 'smooth' });
            };
        }
        
        // Hook into close button to hide
        const closeBtn = document.getElementById('closeMdModalBtn');
        const closeBtnBottom = document.getElementById('closeMdModalBtnBottom');
        
        const hideBtns = () => {
             floatBtns.classList.add('opacity-0', 'pointer-events-none');
             resizeObserver.disconnect();
        };
        
        if (closeBtn) closeBtn.addEventListener('click', hideBtns);
        if (closeBtnBottom) closeBtnBottom.addEventListener('click', hideBtns);
    }
};

window.openMarkdownViewer = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    
    // Clear new content flag if it exists
    if (sub.hasNewContent) {
        sub.hasNewContent = false;
        await saveSubscriptions();
        renderSubscriptions();
    }
    
    await openLocalMarkdownFile(sub.local_path, sub.title || '帖子存档', sub.local_path);
};

// --- Lightbox Functions (Global) ---
function openLightbox(index) {
    if (currentLightboxImages.length === 0) return;
    currentLightboxIndex = index;
    updateLightbox();
    imageLightbox.classList.remove('hidden');
    
    // Show thumbs if multiple images
    if (currentLightboxImages.length > 1) {
        lightboxThumbsContainer.classList.remove('hidden');
        prevImageBtn.classList.remove('hidden');
        nextImageBtn.classList.remove('hidden');
        renderLightboxThumbs();
    } else {
        lightboxThumbsContainer.classList.add('hidden');
        prevImageBtn.classList.add('hidden');
        nextImageBtn.classList.add('hidden');
    }
}

function closeLightbox() {
    imageLightbox.classList.add('hidden');
    lightboxImage.src = ''; // Clear memory
}

async function updateLightbox() {
    const img = currentLightboxImages[currentLightboxIndex];
    if (img) {
        // Load image if needed
        if (!img.src && img.path) {
            // Show loading state (opacity)
            lightboxImage.style.opacity = '0.5';
            try {
                const src = await loadLocalImageData(img.path);
                img.src = src; // Cache it
                
                // Update thumb if it exists
                const thumb = lightboxThumbs.children[currentLightboxIndex];
                if (thumb) {
                    thumb.src = src;
                    thumb.classList.remove('bg-gray-700');
                }
            } catch (e) {
                console.error("Lightbox load failed", e);
            }
            lightboxImage.style.opacity = '1';
        }
        
        lightboxImage.src = img.src || '';
        lightboxImage.alt = img.alt;
        
        // Update active thumb
        const thumbs = lightboxThumbs.querySelectorAll('.lightbox-thumb');
        thumbs.forEach((t, i) => {
            if (i === currentLightboxIndex) t.classList.add('active', 'border-amber-500', 'border-2', 'opacity-100');
            else t.classList.remove('active', 'border-amber-500', 'border-2', 'opacity-100');
        });
        
        // Scroll thumb into view
        if(thumbs[currentLightboxIndex]) {
                thumbs[currentLightboxIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

function renderLightboxThumbs() {
    lightboxThumbs.innerHTML = '';
    currentLightboxImages.forEach((img, i) => {
        const thumb = document.createElement('img');
        // Use transparent placeholder if src is missing
        thumb.src = img.src || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjwvc3ZnPg==';
        thumb.className = `lightbox-thumb h-16 w-auto min-w-[3rem] object-cover rounded cursor-pointer border border-transparent hover:border-white/50 shrink-0 ${i === currentLightboxIndex ? 'active border-amber-500 border-2 opacity-100' : ''}`;
        
        if (!img.src) {
            thumb.classList.add('bg-gray-700'); // Dark placeholder background
        }
        
        thumb.onclick = (e) => {
            e.stopPropagation();
            currentLightboxIndex = i;
            updateLightbox();
        };
        lightboxThumbs.appendChild(thumb);
    });
}

// Initialize Lightbox Listeners
(function initLightboxListeners() {
    if (window.lightboxListenersAttached) return;
    
    if (closeLightboxBtn) closeLightboxBtn.onclick = closeLightbox;
    
    // Click outside (on background) to close
    if (lightboxMainArea) {
        lightboxMainArea.onclick = (e) => {
            if (e.target === lightboxMainArea) closeLightbox();
        };
    }
    
    if (prevImageBtn) {
        prevImageBtn.onclick = (e) => {
            e.stopPropagation();
            currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
            updateLightbox();
        };
    }
    
    if (nextImageBtn) {
        nextImageBtn.onclick = (e) => {
            e.stopPropagation();
            currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
            updateLightbox();
        };
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (imageLightbox.classList.contains('hidden')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevImageBtn.click();
        if (e.key === 'ArrowRight') nextImageBtn.click();
    });
    
    window.lightboxListenersAttached = true;
})();

function simpleMarkdownRender(text) {
    // Very basic escaper
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Headers
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2">$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-md font-bold mb-2">$1</h4>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="text-sm font-bold mb-1">$1</h5>');
    
    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-primary hover:underline">$1</a>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2"/>');
    
    return html;
}

// Helper to find downloaded file based on TID and config options
async function findDownloadedFile(tid, authorid, options) {
    try {
        const entries = await Neutralino.filesystem.readDirectory('outputs');
        
        // Strategy:
        // Match any folder starting with TID followed by:
        // - End of string (exact match "TID")
        // - '-' (TID-Title)
        // - '(' (TID(AuthorID)...)
        
        // Filter candidate folders
        const candidates = entries.filter(e => e.type === 'DIRECTORY');
        
        // Regex for matching: ^tid($|[-(\[])
        const tidPattern = new RegExp(`^${tid}($|[-(\[])`);
        
        // Filter all matching folders for this TID
        let matches = candidates.filter(e => tidPattern.test(e.entry));
        
        let targetFolder = null;

        if (authorid) {
            // If authorid is provided, look for exact match in folder name: (authorid)
            targetFolder = matches.find(e => e.entry.includes(`(${authorid})`));
        }

        // If not found specific author folder, or no authorid provided, fall back to first match
        // But if authorid WAS provided, we should be careful not to match a folder with DIFFERENT authorid
        if (!targetFolder) {
            if (authorid) {
                 // Try to find one WITHOUT any authorid (pure TID or TID-Title)
                 targetFolder = matches.find(e => !/\(\d+\)/.test(e.entry));
                 
                 // If still not found, we must be careful. 
                 // If matches[0] exists but belongs to ANOTHER author, we should NOT use it.
                 if (!targetFolder && matches.length > 0) {
                     const fallback = matches[0];
                     const authorMatch = fallback.entry.match(/\((\d+)\)/);
                     if (authorMatch && authorMatch[1] !== authorid) {
                         // Conflict found: The folder belongs to a different author.
                         // Do NOT select this folder.
                         targetFolder = null;
                     } else {
                         targetFolder = fallback;
                     }
                 }
            } else {
                 // No authorid requested, just take the first one
                 if (matches.length > 0) targetFolder = matches[0];
            }
        }
        
        if (!targetFolder) return null;
        
        const folderPath = `outputs/${targetFolder.entry}`;
        const files = await Neutralino.filesystem.readDirectory(folderPath);
        
        // Find the MD file
        // General Rule: Find any .md file that looks like the main post
        
        let mdFile = null;
        
        // If strict TID folder, prefer post.md
        if (targetFolder.entry === tid) {
            mdFile = files.find(f => f.entry === 'post.md');
        }
        
        // If still not found or other folder type, just take the first MD file
        // Exclude readme.md if it exists
        if (!mdFile) {
            mdFile = files.find(f => f.entry.endsWith('.md') && f.entry.toLowerCase() !== 'readme.md');
        }
        
        if (mdFile) {
            return `${folderPath}/${mdFile.entry}`;
        }
        
    } catch (e) {
        console.error("Error finding downloaded file:", e);
        addLog('ERROR', `寻找存档文件出错: ${e.message}`);
    }
    return null;
}

// Global helper functions for UI interactions
window.openUrl = async (url) => {
    if (!url) return;
    try {
        await Neutralino.os.open(url);
    } catch (e) {
        console.error("Failed to open URL:", e);
        addLog('ERROR', `打开链接失败: ${e.message}`);
    }
};

window.openSubscriptionFolder = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    let filePath = sub.local_path;
    
    // If no path saved, try to find it now
    if (!filePath) {
        filePath = await findDownloadedFile(sub.tid, sub.authorid, sub.saved_options);
        if (filePath) {
            sub.local_path = filePath.replace(/\\/g, '/');
            await saveSubscriptions();
        }
    }

    if (filePath) {
        // filePath is like "outputs/123/post.md"
        // We want the folder path
        const lastSlash = filePath.lastIndexOf('/');
        let folderPath = lastSlash !== -1 ? filePath.substring(0, lastSlash) : filePath;
        
        // Use absolute path for Windows compatibility
        let absPath = NL_CWD + '/' + folderPath;
        // Normalize separators to backslashes for Windows OS open command
        absPath = absPath.replace(/\//g, '\\');
        
        try {
            await Neutralino.os.open(absPath);
            addLog('INFO', `打开文件夹: ${absPath}`);
        } catch (e) {
            console.error("Open folder failed:", e);
            addLog('ERROR', `打开文件夹失败: ${e.message}`);
            // Fallback: try opening just the folder name if absolute fails (rare)
            // alert("打开文件夹失败: " + e.message);
        }
    } else {
        alert("未找到本地存档文件，请先执行更新。");
    }
};




// Generate Table of Contents
function generateTOC() {
    const tocContainer = document.getElementById('mdTOC');
    const mdContent = document.getElementById('mdContent');
    
    if (!tocContainer || !mdContent) return;
    
    tocContainer.innerHTML = '';
    
    // Find headers
    const headers = mdContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headers.length === 0) {
        tocContainer.innerHTML = '<div class="text-gray-400 text-xs italic p-2">暂无目录</div>';
        return;
    }
    
    headers.forEach((header, index) => {
        // Assign ID if not present
        if (!header.id) {
            header.id = `md-header-${index}`;
        }
        
        const level = parseInt(header.tagName.substring(1));
        const link = document.createElement('a');
        link.href = `#${header.id}`;
        link.textContent = header.textContent;
        link.className = `toc-link block text-gray-600 hover:text-primary hover:bg-slate-50 rounded px-2 py-1 transition-colors text-sm truncate`;
        link.title = header.textContent; // Tooltip for truncated text
        
        // Indent based on level
        link.style.paddingLeft = `${(level - 1) * 12 + 8}px`;
        
        link.onclick = (e) => {
            e.preventDefault();
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight active
            document.querySelectorAll('#mdTOC a').forEach(a => a.classList.remove('text-primary', 'font-medium', 'bg-slate-100'));
            link.classList.add('text-primary', 'font-medium', 'bg-slate-100');
        };
        
        tocContainer.appendChild(link);
    });
}

// --- Tab System ---

function switchTab(tabName) {
    if (tabName === 'subscription') {
        // UI Updates
        tabSubscription.classList.remove('text-slate-500', 'hover:text-slate-900', 'bg-transparent');
        tabSubscription.classList.add('shadow-sm', 'bg-white', 'text-slate-900');
        
        tabArchive.classList.add('text-slate-500', 'hover:text-slate-900');
        tabArchive.classList.remove('shadow-sm', 'bg-white', 'text-slate-900');
        
        subscriptionView.classList.remove('hidden');
        archiveView.classList.add('hidden');
    } else if (tabName === 'archive') {
        // UI Updates
        tabArchive.classList.remove('text-slate-500', 'hover:text-slate-900', 'bg-transparent');
        tabArchive.classList.add('shadow-sm', 'bg-white', 'text-slate-900');
        
        tabSubscription.classList.add('text-slate-500', 'hover:text-slate-900');
        tabSubscription.classList.remove('shadow-sm', 'bg-white', 'text-slate-900');
        
        archiveView.classList.remove('hidden');
        subscriptionView.classList.add('hidden');
        
        // Auto scan if empty, but loadArchives handles initial load.
        if (archiveList.length === 0) {
            // maybe scan?
            scanArchives();
        }
    }
}

// --- Archive System ---

async function loadArchives() {
    try {
        // Try to read from JSON first
        let exists = false;
        try {
            let stats = await Neutralino.filesystem.getStats(ARCHIVE_FILE);
            exists = true;
        } catch(e) {
            exists = false;
        }

        if (exists) {
            const content = await Neutralino.filesystem.readFile(ARCHIVE_FILE);
            archiveList = JSON.parse(content);
            renderArchiveList();
            if (archiveCountBadge) archiveCountBadge.textContent = `${archiveList.length} 个存档`;
            addLog('INFO', `已加载 ${archiveList.length} 个存档记录`);
        } else {
            // If no JSON, scan directory
            await scanArchives();
        }
    } catch (err) {
        console.error('Failed to load archives:', err);
        await scanArchives();
    }
}

async function saveArchives() {
    try {
        await Neutralino.filesystem.writeFile(ARCHIVE_FILE, JSON.stringify(archiveList, null, 2));
    } catch (err) {
        console.error('Failed to save archives:', err);
        addLog('ERROR', '保存存档列表失败: ' + err.message);
    }
}

async function scanArchives() {
    try {
        addLog('INFO', '正在扫描本地存档...');
        const entries = await Neutralino.filesystem.readDirectory('outputs');
        
        let newArchives = [];
        
        for (const entry of entries) {
            if (entry.type === 'DIRECTORY') {
                // Check folder name pattern
                // Supports:
                // 1. 46070332
                // 2. 46046493-Title
                // 3. 46065905(66718801)
                // 4. 46046493(61765516)-Title
                const match = entry.entry.match(/^(\d+)(?:\((\d+)\))?(?:-(.*))?$/);
                
                if (match) {
                     const folderPath = `outputs/${entry.entry}`;
                     const tid = match[1];
                     const folderAuthorId = match[2] || null;
                     const folderTitle = match[3] || null; // Title from folder name
                     
                     let command = `ngapost2md ${tid}`;
                     let url = `https://bbs.nga.cn/read.php?tid=${tid}`;
                     
                     if (folderAuthorId) {
                         command += ` --authorid ${folderAuthorId}`;
                         url += `&authorid=${folderAuthorId}`;
                     }

                     let metadata = {
                         id: crypto.randomUUID(),
                         tid: tid,
                         authorid: folderAuthorId,
                         url: url,
                         command: command,
                         title: folderTitle || entry.entry, // Fallback to folder name
                         author: folderAuthorId ? `UID:${folderAuthorId}` : '未知',
                         local_path: '',
                         latestProgress: null
                     };

                     // Try to find MD file and process.ini
                     try {
                        const folderEntries = await Neutralino.filesystem.readDirectory(folderPath);
                        const mdFile = folderEntries.find(e => e.entry.endsWith('.md') && e.entry.toLowerCase() !== 'readme.md');
                        
                        if (mdFile) {
                             metadata.local_path = `${folderPath}/${mdFile.entry}`;

                             // 0. Try to use MD filename as title if current title is weak (pure digits)
                             const mdFileName = mdFile.entry.replace(/\.md$/i, '');
                             if (mdFileName.toLowerCase() !== 'readme' && mdFileName.toLowerCase() !== 'post' && !mdFileName.includes(metadata.tid)) {
                                // Check if current title is weak (pure digits/symbols) OR is 'post'
                                if (/^[\d\s\(\)\-]+$/.test(metadata.title) || metadata.title.toLowerCase() === 'post') {
                                    metadata.title = mdFileName;
                                }
                            }
                             
                             // Read MD content for Title and Author
                            try {
                                const content = await Neutralino.filesystem.readFile(`${folderPath}/${mdFile.entry}`);
                                // Handle both \r\n and \n, read more lines to be safe
                                const lines = content.split(/\r?\n/).slice(0, 100);
                                
                                // 1. Try to find Title
                                // Look for any line starting with 1-6 #s followed by space
                                // Example: ### Title or # Title
                                for (const line of lines) {
                                    const trimmed = line.trim();
                                    const titleMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
                                    if (titleMatch) {
                                        const extractedText = titleMatch[2].trim();
                                        // Ignore if it looks like a floor header (starts with <span or contains id="pid")
                                        if (extractedText.startsWith('<span') || extractedText.includes('id="pid"')) {
                                            continue;
                                        }

                                        // Only overwrite if current title is effectively just IDs (numbers and parens) OR is 'post'
                                       // User request: 只对纯数字标题进行覆盖
                                       if (/^[\d\s\(\)\-]+$/.test(metadata.title) || metadata.title.toLowerCase() === 'post') {
                                           metadata.title = extractedText;
                                       }
                                        break; // Stop after first title found
                                    }
                                }

                                // 2. Try to find Author/Landlord
                                // User feedback: ##### <span id="pid826486433">0.[16] <pid:826486433> 2025-06-06 18:26:50 by 拨小弦(12467316)</span>
                                // Match any line that looks like a floor header with floor 0 (main post)
                                const mainFloorLine = lines.find(l => /id="pid\d+">0\.\[/.test(l));
                                if (mainFloorLine) {
                                    // Match "by username(" - capture non-greedy until (
                                    const authorMatch = mainFloorLine.match(/by\s+(.*?)\(\d+\)/);
                                    if (authorMatch && authorMatch[1]) {
                                        metadata.author = authorMatch[1].trim();
                                    }
                                } else {
                                    // Fallback to old logic
                                    const authorLine = lines.find(l => /楼主|Author/i.test(l));
                                    if (authorLine) {
                                        const authorMatch = authorLine.match(/(?:楼主|Author)(?:：|:|\]|\s+)(.*?)(?:\s+|$)/i);
                                        if (authorMatch && authorMatch[1]) {
                                            let extractedName = authorMatch[1].trim();
                                            if (extractedName.startsWith(']')) extractedName = extractedName.substring(1).trim();
                                            if (extractedName) {
                                                metadata.author = extractedName;
                                            }
                                        }
                                    }
                                }
                            } catch (readErr) {
                                console.warn("Failed to read MD file content:", readErr);
                            }
                        }

                        // Read process.ini
                        try {
                            const iniContent = await Neutralino.filesystem.readFile(`${folderPath}/process.ini`);
                            const maxFloorMatch = iniContent.match(/max_floor=(\d+)/);
                            const maxPageMatch = iniContent.match(/max_page=(\d+)/);
                            
                            if (maxFloorMatch || maxPageMatch) {
                                metadata.latestProgress = {
                                    max_floor: maxFloorMatch ? parseInt(maxFloorMatch[1]) : 0,
                                    max_page: maxPageMatch ? parseInt(maxPageMatch[1]) : 0
                                };
                            }
                        } catch (e) {
                            // No process.ini or read error, ignore
                        }

                     } catch (err) {
                         console.error(`Error reading folder details ${entry.entry}:`, err);
                     }
                     
                     newArchives.push(metadata);
                }
            }
        }
        
        // Update global list
        archiveList = newArchives;
        
        // Sort by TID desc
        archiveList.sort((a, b) => {
             return parseInt(b.tid) - parseInt(a.tid);
        });

        // Save to JSON
        await saveArchives();

        renderArchiveList();
        
        if (archiveCountBadge) {
            archiveCountBadge.textContent = `${archiveList.length} 个存档`;
        }
        
        addLog('INFO', `扫描完成，更新 ${archiveList.length} 个存档`);
        
    } catch (err) {
        console.error('Failed to scan archives:', err);
        addLog('ERROR', '扫描存档失败: ' + err.message);
    }
}

function renderArchiveList() {
    if (!archiveTableBody) return;
    archiveTableBody.innerHTML = '';
    
    if (archiveList.length === 0) {
        archiveTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-10 text-center text-slate-500">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl text-slate-300">folder_off</span>
                        <p>没有找到本地存档</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Create a set of existing commands for fast lookup
    const existingCommands = new Set(subscriptions.map(s => s.command));

    archiveList.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors group';
        
        let isSubscribed = existingCommands.has(item.command);

        // Clean TID for display/logic if needed, but item.tid is already clean
        
        let displayAuthor = item.author;
        
        // Title logic: append (只看楼主) if authorid exists
        let displayTitle = item.title;
        if (item.authorid) {
            displayTitle += ` <span class="text-xs text-slate-400 font-normal">(只看楼主: ${item.authorid})</span>`;
        }
        
        // Progress string
        let progressStr = '-';
        if (item.latestProgress) {
            progressStr = `${item.latestProgress.max_page} 页/ ${item.latestProgress.max_floor} 楼`;
        }

        row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                <a href="#" class="archive-tid-link hover:text-primary hover:underline" title="在浏览器中打开">${item.tid}</a>
            </td>
            <td class="px-6 py-4">
                <a href="#" class="archive-title-link text-sm font-medium text-slate-900 hover:text-primary line-clamp-2 cursor-pointer" title="阅读存档">${displayTitle}</a>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-slate-500">
                ${displayAuthor}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                ${progressStr}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2">
                    <button class="open-folder-btn inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-600 hover:bg-amber-50 transition-all" title="打开所在文件夹">
                        <span class="material-symbols-outlined text-[18px]">folder_open</span>
                    </button>
                    
                    <button class="add-to-sub-btn inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-inset transition-colors ${
                        isSubscribed 
                        ? 'bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50 active:scale-95 active:bg-slate-100'
                    }" data-url="${item.url}" ${isSubscribed ? 'disabled' : ''}>
                        <span class="material-symbols-outlined mr-1 text-[16px]">${isSubscribed ? 'check_circle' : 'add_circle'}</span>
                        <span class="btn-text">${isSubscribed ? '已订阅' : '添加到订阅'}</span>
                    </button>
                </div>
            </td>
        `;

        // Event Listeners
        const tidLink = row.querySelector('.archive-tid-link');
        tidLink.addEventListener('click', (e) => {
            e.preventDefault();
            Neutralino.os.open(item.url);
        });
        
        const openFolderBtn = row.querySelector('.open-folder-btn');
        openFolderBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (item.local_path) {
                // local_path is file path, get folder
                const lastSlash = item.local_path.lastIndexOf('/');
                let folderPath = lastSlash !== -1 ? item.local_path.substring(0, lastSlash) : item.local_path;
                let absPath = NL_CWD + '/' + folderPath;
                absPath = absPath.replace(/\//g, '\\');
                try {
                    await Neutralino.os.open(absPath);
                    addLog('INFO', `打开文件夹: ${absPath}`);
                } catch (e) {
                    console.error("Open folder failed:", e);
                    addLog('ERROR', `打开文件夹失败: ${e.message}`);
                }
            } else {
                 // Try to guess from tid/authorid? Usually local_path should be set if found.
                 // item is from scanArchives which sets local_path
                 alert("无法定位文件夹路径");
            }
        });

        const titleLink = row.querySelector('.archive-title-link');
        titleLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLocalMarkdownFile(item.local_path, item.title, item.local_path);
        });
        
        if (!isSubscribed) {
            // Add event listener only if not subscribed
            const addBtn = row.querySelector('.add-to-sub-btn');
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                // Disable button immediately to prevent double clicks
                addBtn.disabled = true;
                addBtn.classList.add('opacity-70', 'cursor-wait');
                
                const result = await addSubscription(addBtn.dataset.url, true);
                
                addBtn.classList.remove('opacity-70', 'cursor-wait');
                
                if (result.success) {
                    // Update UI to show subscribed state
                    isSubscribed = true;
                    addBtn.className = 'add-to-sub-btn inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-inset transition-colors bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed';
                    addBtn.querySelector('.material-symbols-outlined').textContent = 'check_circle';
                    addBtn.querySelector('.btn-text').textContent = '已订阅';
                    // Update our fast lookup set just in case
                    existingCommands.add(item.command);
                } else if (result.reason === 'duplicate') {
                     // Should verify if it really is subscribed now (maybe added elsewhere)
                     isSubscribed = true;
                     addBtn.className = 'add-to-sub-btn inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-inset transition-colors bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed';
                     addBtn.querySelector('.material-symbols-outlined').textContent = 'check_circle';
                     addBtn.querySelector('.btn-text').textContent = '已订阅';
                } else {
                    // Re-enable if failed
                    addBtn.disabled = false;
                    alert("添加失败: " + result.message);
                }
            });
        }
        
        archiveTableBody.appendChild(row);
    });
}

// Start
init();
