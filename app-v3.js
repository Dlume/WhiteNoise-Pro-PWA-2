/**
 * WhiteNoise Pro PWA v3.0 - 主应用程序
 * 功能增强版：定时关闭 + 音量控制 + 闹钟功能 + 预设保存
 */

// 音效配置
const SOUND_CONFIG = [
    { id: 'rain', name: '雨声', icon: '🌧️', color: '#3b82f6' },
    { id: 'thunder', name: '雷声', icon: '⚡', color: '#fbbf24' },
    { id: 'ocean', name: '海浪', icon: '🌊', color: '#06b6d4' },
    { id: 'forest', name: '森林', icon: '🌲', color: '#22c55e' },
    { id: 'cafe', name: '咖啡馆', icon: '☕', color: '#a8a29e' },
    { id: 'fireplace', name: '壁炉', icon: '🔥', color: '#f97316' },
    { id: 'wind', name: '风声', icon: '💨', color: '#94a3b8' }
];

// 应用状态
const AppState = {
    currentTab: 'sounds',
    activeSounds: new Set(),
    isPlaying: false,
    masterVolume: 0.5
};

// 管理器实例
let sleepTimer = null;
let volumeManager = null;
let alarmClock = null;
let presetManager = null;

/**
 * 睡眠定时器管理器
 */
class SleepTimer {
    constructor() {
        this.timerId = null;
        this.fadeOutInterval = null;
        this.remainingMinutes = null;
    }

    start(minutes) {
        this.stop();
        this.remainingMinutes = minutes;

        console.log(`⏱️ 睡眠定时器启动：${minutes}分钟`);

        this.timerId = setTimeout(() => {
            console.log('⏱️ 开始淡出...');
            this.fadeOut(5000);
        }, minutes * 60 * 1000);

        this.updateDisplay(minutes);
        this.saveSetting(minutes);
    }

    fadeOut(duration) {
        const startTime = Date.now();
        const initialVolume = audioGenerator.getVolume();

        this.fadeOutInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const newVolume = initialVolume * (1 - progress);
            audioGenerator.setVolume(newVolume);

            if (progress >= 1) {
                this.stop();
                audioGenerator.stopAll();
                AppState.isPlaying = false;
                updatePlaybackControls();
                console.log('✅ 播放已停止');
            }
        }, 100);
    }

    stop() {
        if (this.timerId) clearTimeout(this.timerId);
        if (this.fadeOutInterval) clearInterval(this.fadeOutInterval);
        this.timerId = null;
        this.fadeOutInterval = null;
        this.remainingMinutes = null;
        this.updateDisplay(null);
    }

    saveSetting(minutes) {
        localStorage.setItem('whitenoise-sleep-timer', minutes.toString());
    }

    loadSetting() {
        const saved = localStorage.getItem('whitenoise-sleep-timer');
        return saved ? parseInt(saved) : 30;
    }

    updateDisplay(minutes) {
        const timerDisplay = document.getElementById('sleep-timer-display');
        if (!timerDisplay) return;

        if (minutes === null) {
            timerDisplay.textContent = '';
            timerDisplay.style.display = 'none';
        } else {
            timerDisplay.textContent = `⏱️ ${minutes}分钟后关闭`;
            timerDisplay.style.display = 'block';
        }

        // 更新按钮状态
        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.minutes) === minutes) {
                btn.classList.add('active');
            }
        });
    }
}

/**
 * 音量管理器
 */
class VolumeManager {
    constructor() {
        this.soundVolumes = new Map();
        this.init();
    }

    init() {
        // 初始化默认音量
        SOUND_CONFIG.forEach(sound => {
            this.soundVolumes.set(sound.id, 70);
        });

        // 加载保存的音量设置
        this.loadFromStorage();

        // 绑定滑块事件
        this.bindSliderEvents();
    }

    setVolume(soundId, volume) {
        const normalizedVolume = volume / 100;
        this.soundVolumes.set(soundId, volume);
        
        if (audioGenerator.activeNodes.has(soundId)) {
            audioGenerator.setSoundVolume(soundId, normalizedVolume);
        }
        
        this.saveToStorage();
        this.updateSliderDisplay(soundId, volume);
    }

    getVolume(soundId) {
        return this.soundVolumes.get(soundId) || 70;
    }

    updateSliderDisplay(soundId, volume) {
        const slider = document.querySelector(`.volume-slider[data-sound="${soundId}"]`);
        if (slider) {
            slider.value = volume;
            const display = slider.parentElement.querySelector('.volume-value');
            if (display) {
                display.textContent = `${volume}%`;
            }
        }
    }

    bindSliderEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('volume-slider')) {
                const soundId = e.target.dataset.sound;
                const volume = parseInt(e.target.value);
                this.setVolume(soundId, volume);
            }
        });
    }

    saveToStorage() {
        const data = Object.fromEntries(this.soundVolumes);
        localStorage.setItem('whitenoise-volumes', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('whitenoise-volumes');
        if (saved) {
            const data = JSON.parse(saved);
            Object.entries(data).forEach(([soundId, volume]) => {
                this.soundVolumes.set(soundId, volume);
            });
        }
    }
}

/**
 * 闹钟管理器
 */
class AlarmClock {
    constructor() {
        this.alarmTime = null;
        this.alarmSound = 'rain';
        this.alarmId = null;
        this.snoozeCount = 0;
        this.maxSnooze = 3;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
    }

    set(hours, minutes, soundId) {
        const now = new Date();
        const alarm = new Date();
        alarm.setHours(hours, minutes, 0, 0);

        // 如果时间已过，设置为明天
        if (alarm <= now) {
            alarm.setDate(alarm.getDate() + 1);
        }

        this.alarmTime = alarm;
        this.alarmSound = soundId;
        this.snoozeCount = 0;

        this.schedule();
        this.save();
        this.updateDisplay();

        console.log(`⏰ 闹钟已设置：${alarm.toLocaleTimeString()}`);
        return alarm;
    }

    schedule() {
        if (this.alarmId) clearTimeout(this.alarmId);

        const delay = this.alarmTime - Date.now();
        console.log(`⏰ 距离闹钟响起：${Math.round(delay / 1000 / 60)}分钟`);

        this.alarmId = setTimeout(() => {
            this.trigger();
        }, delay);
    }

    trigger() {
        console.log('⏰ 闹钟响起！');

        // 播放闹钟
        this.playAlarmWithFadeIn();

        // 显示通知
        this.showNotification();

        // 请求唤醒锁
        this.requestWakeLock();
    }

    playAlarmWithFadeIn() {
        audioGenerator.play(this.alarmSound);
        audioGenerator.setVolume(0);

        const startTime = Date.now();
        const duration = 60000; // 60 秒淡入

        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const volume = this.easeOutCubic(progress);
            audioGenerator.setVolume(volume);

            if (progress >= 1) {
                clearInterval(fadeInterval);
            }
        }, 100);
    }

    snooze(minutes = 10) {
        if (this.snoozeCount >= this.maxSnooze) {
            console.log('⚠️ 已达到最大小睡次数');
            this.cancel();
            return;
        }

        this.snoozeCount++;
        console.log(`😴 小睡 ${minutes}分钟 (${this.snoozeCount}/${this.maxSnooze})`);

        const now = new Date();
        this.alarmTime = new Date(now.getTime() + minutes * 60 * 1000);

        this.schedule();
        this.save();
        this.updateDisplay();
    }

    cancel() {
        console.log('❌ 闹钟已取消');
        if (this.alarmId) clearTimeout(this.alarmId);
        this.alarmId = null;
        this.alarmTime = null;
        this.snoozeCount = 0;

        audioGenerator.stopAll();
        this.removeFromStorage();
        this.updateDisplay();
    }

    easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }

    save() {
        const data = {
            alarmTime: this.alarmTime ? this.alarmTime.toISOString() : null,
            alarmSound: this.alarmSound,
            snoozeCount: this.snoozeCount
        };
        localStorage.setItem('whitenoise-alarm', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('whitenoise-alarm');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.alarmTime) {
                const alarmTime = new Date(data.alarmTime);
                const now = new Date();

                // 如果闹钟时间还未到，重新设置
                if (alarmTime > now) {
                    this.alarmTime = alarmTime;
                    this.alarmSound = data.alarmSound || 'rain';
                    this.snoozeCount = data.snoozeCount || 0;
                    this.schedule();
                    this.updateDisplay();
                } else {
                    // 已过期的闹钟，清除
                    this.removeFromStorage();
                }
            }
        }
    }

    removeFromStorage() {
        localStorage.removeItem('whitenoise-alarm');
    }

    updateDisplay() {
        const alarmStatusEl = document.getElementById('alarm-status');
        const alarmCountdownEl = document.getElementById('alarm-countdown');

        if (!alarmStatusEl) return;

        if (this.alarmTime) {
            const now = new Date();
            const diff = this.alarmTime - now;

            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                alarmStatusEl.style.display = 'block';
                alarmCountdownEl.textContent = `距离闹钟响起：${hours}小时 ${minutes}分钟`;

                // 更新闹钟标签页的显示
                const alarmTimeDisplay = document.getElementById('alarm-time-display');
                if (alarmTimeDisplay) {
                    alarmTimeDisplay.textContent = this.alarmTime.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } else {
                alarmStatusEl.style.display = 'none';
            }
        } else {
            alarmStatusEl.style.display = 'none';
        }
    }

    showNotification() {
        if (Notification.permission === 'granted') {
            new Notification('⏰ 闹钟响了！', {
                body: '该起床了！',
                icon: 'icons/icon-192x192.png',
                requireInteraction: true,
                actions: [
                    { action: 'snooze', title: '小睡 10 分钟' },
                    { action: 'cancel', title: '关闭' }
                ]
            });
        }
    }

    requestWakeLock() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(err => {
                console.log('Wake Lock 请求失败:', err);
            });
        }
    }

    bindEvents() {
        // 监听通知点击
        navigator.serviceWorker?.addEventListener('message', (event) => {
            if (event.data.action === 'snooze') {
                this.snooze(10);
            } else if (event.data.action === 'cancel') {
                this.cancel();
            }
        });
    }
}

/**
 * 预设管理器
 */
class PresetManager {
    constructor() {
        this.presets = [];
        this.maxPresets = 3;
        this.loadFromStorage();
    }

    save(name, slot = null) {
        const preset = {
            id: slot || Date.now(),
            name: name,
            sounds: Array.from(AppState.activeSounds),
            volumes: Object.fromEntries(volumeManager.soundVolumes),
            createdAt: new Date().toISOString()
        };

        const existingIndex = this.presets.findIndex(p => p.id === preset.id);

        if (existingIndex >= 0) {
            this.presets[existingIndex] = preset;
        } else {
            if (this.presets.length >= this.maxPresets) {
                this.presets.shift();
            }
            this.presets.push(preset);
        }

        this.saveToStorage();
        this.render();
        console.log(`💾 预设已保存：${name}`);
    }

    load(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        console.log(`📥 加载预设：${preset.name}`);

        // 停止当前播放
        audioGenerator.stopAll();
        AppState.activeSounds.clear();

        // 加载音效
        preset.sounds.forEach(soundId => {
            audioGenerator.play(soundId);
            AppState.activeSounds.add(soundId);
        });

        // 恢复音量
        Object.entries(preset.volumes).forEach(([soundId, volume]) => {
            volumeManager.setVolume(soundId, volume);
        });

        // 更新 UI
        document.querySelectorAll('.sound-card').forEach(card => {
            card.classList.toggle('active', AppState.activeSounds.has(card.dataset.sound));
        });

        updatePlaybackControls();
    }

    delete(presetId) {
        this.presets = this.presets.filter(p => p.id !== presetId);
        this.saveToStorage();
        this.render();
    }

    saveToStorage() {
        localStorage.setItem('whitenoise-presets', JSON.stringify(this.presets));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('whitenoise-presets');
        if (saved) {
            this.presets = JSON.parse(saved);
        }
    }

    render() {
        const container = document.getElementById('presets-container');
        if (!container) return;

        if (this.presets.length === 0) {
            container.innerHTML = '<p class="no-presets">暂无预设，先调节音效然后点击"保存预设"</p>';
            return;
        }

        container.innerHTML = this.presets.map(preset => `
            <div class="preset-card" data-id="${preset.id}">
                <div class="preset-header">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-date">${new Date(preset.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
                <div class="preset-sounds">
                    ${preset.sounds.map(id => {
                        const sound = SOUND_CONFIG.find(s => s.id === id);
                        return sound ? `${sound.icon} ${sound.name}` : id;
                    }).join(' + ')}
                </div>
                <div class="preset-actions">
                    <button class="preset-btn load">加载</button>
                    <button class="preset-btn delete">删除</button>
                </div>
            </div>
        `).join('');

        // 绑定事件
        container.querySelectorAll('.preset-btn.load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = parseInt(e.target.closest('.preset-card').dataset.id);
                this.load(presetId);
            });
        });

        container.querySelectorAll('.preset-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = parseInt(e.target.closest('.preset-card').dataset.id);
                if (confirm('确定要删除这个预设吗？')) {
                    this.delete(presetId);
                }
            });
        });
    }
}

/**
 * 初始化应用程序
 */
async function initApp() {
    console.log('🎵 WhiteNoise Pro PWA v3.0 initializing...');

    // 初始化音频生成器
    await audioGenerator.init();

    // 初始化管理器
    sleepTimer = new SleepTimer();
    volumeManager = new VolumeManager();
    alarmClock = new AlarmClock();
    presetManager = new PresetManager();

    // 注册事件监听器
    setupEventListeners();

    // 渲染音效网格
    renderSoundGrid();

    // 渲染预设
    presetManager.render();

    // 注册 Service Worker
    registerServiceWorker();

    // 设置 iOS 后台音频
    setupIOSBackgroundAudio();

    // 请求通知权限
    requestNotificationPermission();

    console.log('✅ WhiteNoise Pro PWA v3.0 ready');
}

/**
 * 渲染音效网格（带音量滑块）
 */
function renderSoundGrid() {
    const grid = document.getElementById('sound-grid');
    if (!grid) return;

    grid.innerHTML = SOUND_CONFIG.map(sound => {
        const volume = volumeManager ? volumeManager.getVolume(sound.id) : 70;
        return `
            <div class="sound-card" data-sound="${sound.id}" style="--card-color: ${sound.color}">
                <div class="sound-icon">${sound.icon}</div>
                <div class="sound-name">${sound.name}</div>
                <div class="volume-control">
                    <input type="range" min="0" max="100" value="${volume}" 
                           class="volume-slider" data-sound="${sound.id}">
                    <span class="volume-value">${volume}%</span>
                </div>
                <div class="sound-indicator"></div>
            </div>
        `;
    }).join('');

    // 添加点击事件
    grid.querySelectorAll('.sound-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 如果点击的是滑块，不触发音效切换
            if (e.target.classList.contains('volume-slider')) return;
            toggleSound(card.dataset.sound);
        });
    });
}

/**
 * 切换音效播放
 */
async function toggleSound(soundId) {
    await audioGenerator.resume();

    const card = document.querySelector(`[data-sound="${soundId}"]`);
    if (!card) return;

    const volume = volumeManager ? volumeManager.getVolume(soundId) / 100 : 0.7;

    if (AppState.activeSounds.has(soundId)) {
        audioGenerator.stop(soundId);
        AppState.activeSounds.delete(soundId);
        card.classList.remove('active');
    } else {
        audioGenerator.play(soundId);
        audioGenerator.setSoundVolume(soundId, volume);
        AppState.activeSounds.add(soundId);
        card.classList.add('active');
        AppState.isPlaying = true;
        updatePlaybackControls();
    }

    updatePlaybackControls();
}

/**
 * 更新播放控制按钮状态
 */
function updatePlaybackControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (!playBtn || !stopBtn) return;

    if (AppState.isPlaying) {
        playBtn.textContent = '⏸';
        playBtn.setAttribute('aria-label', '暂停');
    } else {
        playBtn.textContent = '▶';
        playBtn.setAttribute('aria-label', '播放');
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // 播放控制
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (playBtn) {
        playBtn.addEventListener('click', togglePlayback);
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', stopAll);
    }

    // 定时关闭
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const minutes = parseInt(e.target.dataset.minutes);
            if (minutes === -1) {
                sleepTimer.stop();
            } else {
                sleepTimer.start(minutes);
            }
        });
    });

    // 闹钟设置
    const alarmSetBtn = document.getElementById('alarm-set-btn');
    if (alarmSetBtn) {
        alarmSetBtn.addEventListener('click', setAlarm);
    }

    const alarmCancelBtn = document.getElementById('alarm-cancel-btn');
    if (alarmCancelBtn) {
        alarmCancelBtn.addEventListener('click', () => alarmClock.cancel());
    }

    const alarmSnoozeBtn = document.getElementById('alarm-snooze-btn');
    if (alarmSnoozeBtn) {
        alarmSnoozeBtn.addEventListener('click', () => alarmClock.snooze(10));
    }

    // 预设保存
    const savePresetBtn = document.getElementById('save-preset-btn');
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            const name = prompt('请输入预设名称:');
            if (name) {
                presetManager.save(name);
            }
        });
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayback();
        }
    });
}

/**
 * 切换标签页
 */
function switchTab(tabId) {
    AppState.currentTab = tabId;

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
}

/**
 * 播放/暂停所有音效
 */
async function togglePlayback() {
    await audioGenerator.resume();

    if (AppState.isPlaying) {
        audioGenerator.setVolume(0);
        AppState.isPlaying = false;
    } else {
        if (AppState.activeSounds.size === 0 && SOUND_CONFIG.length > 0) {
            toggleSound(SOUND_CONFIG[0].id);
        } else {
            audioGenerator.setVolume(volumeManager ? volumeManager.masterVolume : 0.5);
        }
        AppState.isPlaying = true;
    }

    updatePlaybackControls();
}

/**
 * 停止所有音效
 */
function stopAll() {
    audioGenerator.stopAll();
    AppState.activeSounds.clear();
    AppState.isPlaying = false;

    document.querySelectorAll('.sound-card').forEach(card => {
        card.classList.remove('active');
    });

    updatePlaybackControls();
}

/**
 * 设置闹钟
 */
function setAlarm() {
    const hoursSelect = document.getElementById('alarm-hours');
    const minutesSelect = document.getElementById('alarm-minutes');
    const soundSelect = document.getElementById('alarm-sound');

    if (!hoursSelect || !minutesSelect || !soundSelect) return;

    const hours = parseInt(hoursSelect.value);
    const minutes = parseInt(minutesSelect.value);
    const soundId = soundSelect.value;

    const alarmTime = alarmClock.set(hours, minutes, soundId);

    alert(`⏰ 闹钟已设置在 ${alarmTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
}

/**
 * 注册 Service Worker
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }
}

/**
 * 设置 iOS 后台音频
 */
function setupIOSBackgroundAudio() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'WhiteNoise Pro',
            artist: '白噪音',
            album: '专注与放松',
            artwork: [
                { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', async () => {
            await audioGenerator.resume();
            audioGenerator.setVolume(volumeManager ? volumeManager.masterVolume : 0.5);
            AppState.isPlaying = true;
            updatePlaybackControls();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            audioGenerator.setVolume(0);
            AppState.isPlaying = false;
            updatePlaybackControls();
        });

        navigator.mediaSession.setActionHandler('stop', () => {
            stopAll();
        });
    }

    // 唤醒锁
    let wakeLock = null;
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake Lock not supported:', err);
        }
    }

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });

    requestWakeLock();
}

/**
 * 请求通知权限
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 导出供调试使用
window.WhiteNoiseApp = {
    state: AppState,
    sleepTimer,
    volumeManager,
    alarmClock,
    presetManager,
    toggleSound,
    togglePlayback,
    stopAll
};
