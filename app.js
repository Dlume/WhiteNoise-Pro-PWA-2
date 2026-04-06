/**
 * WhiteNoise Pro PWA - 主应用程序
 * 使用程序化音频生成，无需外部音频文件
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
    volume: 0.5,
    focusMode: 'work',
    focusDuration: 25,
    focusTimeRemaining: 25 * 60,
    focusTimerId: null,
    isFocusRunning: false,
    breathingPhase: 'inhale',
    breathingTimeRemaining: 0,
    breathingTimerId: null,
    isBreathingRunning: false
};

/**
 * 初始化应用程序
 */
async function initApp() {
    console.log('🎵 WhiteNoise Pro PWA initializing...');

    // 初始化程序化音频生成器
    await audioGenerator.init();

    // 注册事件监听器
    setupEventListeners();

    // 渲染音效网格
    renderSoundGrid();

    // 注册 Service Worker
    registerServiceWorker();

    // 设置 iOS 后台音频
    setupIOSBackgroundAudio();

    console.log('✅ WhiteNoise Pro PWA ready');
}

/**
 * 渲染音效网格
 */
function renderSoundGrid() {
    const grid = document.getElementById('sound-grid');
    if (!grid) return;

    grid.innerHTML = SOUND_CONFIG.map(sound => `
        <div class="sound-card" data-sound="${sound.id}" style="--card-color: ${sound.color}">
            <div class="sound-icon">${sound.icon}</div>
            <div class="sound-name">${sound.name}</div>
            <div class="sound-indicator"></div>
        </div>
    `).join('');

    // 添加点击事件
    grid.querySelectorAll('.sound-card').forEach(card => {
        card.addEventListener('click', () => toggleSound(card.dataset.sound));
    });
}

/**
 * 切换音效播放
 */
async function toggleSound(soundId) {
    // 确保音频上下文已恢复（iOS 要求）
    await audioGenerator.resume();

    const card = document.querySelector(`[data-sound="${soundId}"]`);
    if (!card) return;

    if (AppState.activeSounds.has(soundId)) {
        // 停止播放
        audioGenerator.stop(soundId);
        AppState.activeSounds.delete(soundId);
        card.classList.remove('active');
    } else {
        // 开始播放
        audioGenerator.play(soundId);
        AppState.activeSounds.add(soundId);
        card.classList.add('active');
        AppState.isPlaying = true;
        updatePlaybackControls();
    }

    // 更新播放控制按钮
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
 * 播放/暂停所有音效
 */
async function togglePlayback() {
    await audioGenerator.resume();

    if (AppState.isPlaying) {
        // 暂停所有
        audioGenerator.setVolume(0);
        AppState.isPlaying = false;
    } else {
        // 恢复播放
        if (AppState.activeSounds.size === 0) {
            // 如果没有激活的音效，播放第一个
            toggleSound(SOUND_CONFIG[0].id);
        } else {
            audioGenerator.setVolume(AppState.volume);
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
    audioGenerator.setVolume(AppState.volume);

    // 更新 UI
    document.querySelectorAll('.sound-card').forEach(card => {
        card.classList.remove('active');
    });

    updatePlaybackControls();
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

    // 专注模式控制
    const focusPlayBtn = document.getElementById('focus-play');
    if (focusPlayBtn) {
        focusPlayBtn.addEventListener('click', toggleFocusTimer);
    }

    // 专注时长选择
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setFocusDuration(parseInt(e.target.dataset.duration)));
    });

    // 呼吸练习控制
    const breathingPlayBtn = document.getElementById('breathing-play');
    if (breathingPlayBtn) {
        breathingPlayBtn.addEventListener('click', toggleBreathingExercise);
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
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

    // 更新按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
}

/**
 * 设置专注时长
 */
function setFocusDuration(minutes) {
    AppState.focusDuration = minutes;
    AppState.focusTimeRemaining = minutes * 60;

    // 更新按钮状态
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.duration) === minutes);
    });

    // 更新显示
    updateFocusDisplay();
}

/**
 * 更新专注显示
 */
function updateFocusDisplay() {
    const timeEl = document.getElementById('focus-time');
    if (!timeEl) return;

    const minutes = Math.floor(AppState.focusTimeRemaining / 60);
    const seconds = AppState.focusTimeRemaining % 60;
    timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 切换专注计时器
 */
function toggleFocusTimer() {
    if (AppState.isFocusRunning) {
        pauseFocusTimer();
    } else {
        startFocusTimer();
    }
}

/**
 * 启动专注计时器
 */
function startFocusTimer() {
    AppState.isFocusRunning = true;

    const playBtn = document.getElementById('focus-play');
    if (playBtn) {
        playBtn.textContent = '⏸';
    }

    // 播放专注音效（雨声）
    if (!AppState.activeSounds.has('rain')) {
        toggleSound('rain');
    }

    AppState.focusTimerId = setInterval(() => {
        AppState.focusTimeRemaining--;
        updateFocusDisplay();

        if (AppState.focusTimeRemaining <= 0) {
            completeFocusSession();
        }
    }, 1000);
}

/**
 * 暂停专注计时器
 */
function pauseFocusTimer() {
    AppState.isFocusRunning = false;

    if (AppState.focusTimerId) {
        clearInterval(AppState.focusTimerId);
        AppState.focusTimerId = null;
    }

    const playBtn = document.getElementById('focus-play');
    if (playBtn) {
        playBtn.textContent = '▶';
    }
}

/**
 * 完成专注会话
 */
function completeFocusSession() {
    pauseFocusTimer();
    AppState.focusTimeRemaining = AppState.focusDuration * 60;
    updateFocusDisplay();

    // 播放完成提示音
    playNotificationSound();

    // 显示通知
    if (Notification.permission === 'granted') {
        new Notification('专注完成！', {
            body: `恭喜完成 ${AppState.focusDuration} 分钟的专注时间`,
            icon: 'icons/icon-192x192.png'
        });
    }
}

/**
 * 播放提示音
 */
function playNotificationSound() {
    if (!audioGenerator.audioContext) return;

    const oscillator = audioGenerator.audioContext.createOscillator();
    const gainNode = audioGenerator.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioGenerator.audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioGenerator.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioGenerator.audioContext.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioGenerator.audioContext.currentTime + 0.5);
}

/**
 * 切换呼吸练习
 */
function toggleBreathingExercise() {
    if (AppState.isBreathingRunning) {
        pauseBreathingExercise();
    } else {
        startBreathingExercise();
    }
}

/**
 * 启动呼吸练习
 */
function startBreathingExercise() {
    AppState.isBreathingRunning = true;
    AppState.breathingPhase = 'inhale';
    AppState.breathingTimeRemaining = 4;

    const playBtn = document.getElementById('breathing-play');
    if (playBtn) {
        playBtn.textContent = '⏸';
    }

    updateBreathingDisplay();
    runBreathingCycle();
}

/**
 * 暂停呼吸练习
 */
function pauseBreathingExercise() {
    AppState.isBreathingRunning = false;

    if (AppState.breathingTimerId) {
        clearTimeout(AppState.breathingTimerId);
        AppState.breathingTimerId = null;
    }

    const playBtn = document.getElementById('breathing-play');
    if (playBtn) {
        playBtn.textContent = '▶';
    }
}

/**
 * 运行呼吸周期（4-7-8 呼吸法）
 */
function runBreathingCycle() {
    if (!AppState.isBreathingRunning) return;

    AppState.breathingTimerId = setTimeout(() => {
        switch (AppState.breathingPhase) {
            case 'inhale':
                AppState.breathingPhase = 'hold';
                AppState.breathingTimeRemaining = 7;
                break;
            case 'hold':
                AppState.breathingPhase = 'exhale';
                AppState.breathingTimeRemaining = 8;
                break;
            case 'exhale':
                AppState.breathingPhase = 'inhale';
                AppState.breathingTimeRemaining = 4;
                break;
        }

        updateBreathingDisplay();
        runBreathingCycle();
    }, AppState.breathingTimeRemaining * 1000);
}

/**
 * 更新呼吸显示
 */
function updateBreathingDisplay() {
    const phaseEl = document.getElementById('breathing-phase');
    const instructionEl = document.getElementById('breathing-instruction');

    if (!phaseEl || !instructionEl) return;

    const phaseText = {
        'inhale': { text: '吸气', instruction: '用鼻子深深吸气，感受空气充满肺部' },
        'hold': { text: '屏息', instruction: '保持呼吸，感受气息在体内流动' },
        'exhale': { text: '呼气', instruction: '用嘴缓缓呼气，释放所有压力' }
    };

    const phase = phaseText[AppState.breathingPhase];
    phaseEl.textContent = phase.text;
    instructionEl.textContent = phase.instruction;

    // 更新动画类
    const visualEl = document.getElementById('breathing-visual');
    if (visualEl) {
        visualEl.className = `breathing-visual ${AppState.breathingPhase}`;
    }
}

/**
 * 设置 iOS 后台音频
 */
function setupIOSBackgroundAudio() {
    // 设置媒体会话 API
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
            audioGenerator.setVolume(AppState.volume);
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

    // 防止 iOS 屏幕关闭
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

    // 页面可见时请求唤醒锁
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });

    requestWakeLock();
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
    toggleSound,
    togglePlayback,
    stopAll,
    audioGenerator
};
