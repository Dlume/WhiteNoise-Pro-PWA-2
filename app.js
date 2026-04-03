// 音频管理�?- 支持后台播放
class PWAAudioManager {
    constructor() {
        this.audioElements = {};
        this.isPlaying = false;
        this.currentSounds = [];
        this.setupMediaSession();
    }

    // 创建音频元素
    createAudioElement(soundName, url) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.loop = true;
        audio.preload = 'auto';
        audio.setAttribute('webkit-playsinline', '');
        audio.setAttribute('playsinline', '');
        document.body.appendChild(audio);
        this.audioElements[soundName] = audio;
        return audio;
    }

    // 播放指定音效
    playSound(soundName, volume = 0.5) {
        const audio = this.audioElements[soundName];
        if (audio) {
            audio.volume = volume;
            // 关键：单独播放每个音频以支持后台
            audio.play().catch(e => console.log('播放错误:', e));
            if (!this.currentSounds.includes(soundName)) {
                this.currentSounds.push(soundName);
            }
            this.isPlaying = true;
        }
    }

    // 停止指定音效
    stopSound(soundName) {
        const audio = this.audioElements[soundName];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            this.currentSounds = this.currentSounds.filter(name => name !== soundName);
            if (this.currentSounds.length === 0) {
                this.isPlaying = false;
            }
        }
    }

    // 停止所有音�?
    stopAll() {
        Object.values(this.audioElements).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.currentSounds = [];
        this.isPlaying = false;
    }

    // 设置音量
    setVolume(soundName, volume) {
        const audio = this.audioElements[soundName];
        if (audio) {
            audio.volume = volume;
        }
    }

    // 获取当前音量
    getVolume(soundName) {
        const audio = this.audioElements[soundName];
        return audio ? audio.volume : 0.5;
    }

    // 设置媒体会话（iOS 后台播放关键�?
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'WhiteNoise Pro',
                artist: '白噪�?,
                album: '自然声音',
                artwork: [
                    { src: '/icons/icon-192x192.png', sizes: '192x192' },
                    { src: '/icons/icon-512x512.png', sizes: '512x512' }
                ]
            });

            // 播放控制
            navigator.mediaSession.setActionHandler('play', () => {
                this.currentSounds.forEach(sound => this.playSound(sound, this.getVolume(sound)));
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                this.stopAll();
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                this.stopAll();
            });
        }
    }

    // 初始化所有音�?
    initializeSounds() {
        const sounds = [
            { name: 'rain', file: 'rain.mp3', displayName: '雨声' },
            { name: 'ocean', file: 'ocean.mp3', displayName: '海浪' },
            { name: 'forest', file: 'forest.mp3', displayName: '森林' },
            { name: 'cafe', file: 'cafe.mp3', displayName: '咖啡�? },
            { name: 'thunder', file: 'thunder.mp3', displayName: '雷声' },
            { name: 'wind', file: 'wind.mp3', displayName: '风声' },
            { name: 'fireplace', file: 'fireplace.mp3', displayName: '篝火' }
        ];

        sounds.forEach(sound => {
            this.createAudioElement(sound.name, `sounds/${sound.file}`);
        });

        return sounds;
    }
}
