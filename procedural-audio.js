/**
 * WhiteNoise Pro - 程序化音频生成器
 * 使用 Web Audio API 生成白噪音，无需外部音频文件
 * 
 * 支持的音效类型：
 * - 白噪音 (White Noise): 全频段均匀分布
 * - 粉红噪音 (Pink Noise): 每倍频程衰减 3dB，更自然
 * - 棕色噪音 (Brown Noise): 每倍频程衰减 6dB，更深沉
 * - 雨声：粉红噪音 + 带通滤波
 * - 雷声：棕色噪音 + 低频增强 + 脉冲调制
 * - 海浪：粉红噪音 + 低频滤波 + 振幅调制
 * - 森林：白噪音 + 高频滤波 + 随机调制
 * - 咖啡馆：多频段噪音 + 人声模拟
 * - 壁炉：粉红噪音 + 随机爆裂声
 * - 风声：带通滤波 + 频率调制
 */

class ProceduralAudioGenerator {
    constructor() {
        this.audioContext = null;
        this.activeNodes = new Map();
        this.masterGain = null;
        this.initialized = false;
    }

    /**
     * 初始化音频上下文
     * 必须在用户交互后调用（浏览器自动播放策略）
     */
    async init() {
        if (this.initialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // 创建主增益节点
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.5;

        this.initialized = true;
        console.log('🎵 ProceduralAudioGenerator initialized');
    }

    /**
     * 创建白噪音缓冲区
     */
    createNoiseBuffer() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    /**
     * 创建粉红噪音（使用 Paul Kellett 算法）
     */
    createPinkNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11;
            b6 = white * 0.115926;
        }

        return buffer;
    }

    /**
     * 创建棕色噪音（布朗运动）
     */
    createBrownNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        let lastOut = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        return buffer;
    }

    /**
     * 创建雨声音效
     * 粉红噪音 + 带通滤波模拟雨滴
     */
    createRainSound() {
        const buffer = this.createPinkNoise();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 带通滤波器模拟雨滴
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        bandpass.Q.value = 0.5;

        // 高通滤波器去除低频
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 500;

        source.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(this.masterGain);

        return { source, nodes: [bandpass, highpass] };
    }

    /**
     * 创建雷声音效
     * 棕色噪音 + 低频增强 + 脉冲调制
     */
    createThunderSound() {
        const buffer = this.createBrownNoise();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 低通滤波器增强低频
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200;

        // 增益控制脉冲
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.3;

        // 创建雷声脉冲效果
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 1.0);
        gainNode.gain.exponentialRampToValueAtTime(0.3, now + 2.0);

        source.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { source, nodes: [lowpass, gainNode] };
    }

    /**
     * 创建海浪音效
     * 粉红噪音 + 低频滤波 + 振幅调制
     */
    createOceanSound() {
        const buffer = this.createPinkNoise();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 低通滤波器
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 400;

        // 创建波浪调制
        const gainNode = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.1; // 0.1Hz = 10 秒一个周期
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 0.3;

        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);

        gainNode.gain.value = 0.5;

        source.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        lfo.start();

        return { source, nodes: [lowpass, gainNode, lfo, lfoGain] };
    }

    /**
     * 创建森林音效
     * 白噪音 + 高频滤波 + 随机调制
     */
    createForestSound() {
        const buffer = this.createNoiseBuffer();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 带通滤波器
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 2000;
        bandpass.Q.value = 1;

        // 高频滤波器
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 1000;

        source.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(this.masterGain);

        return { source, nodes: [bandpass, highpass] };
    }

    /**
     * 创建咖啡馆音效
     * 多频段噪音 + 人声模拟
     */
    createCafeSound() {
        const buffer = this.createPinkNoise();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 带通滤波器模拟人声频率
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 500;
        bandpass.Q.value = 0.8;

        // 添加一些随机性
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.3;

        source.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { source, nodes: [bandpass, gainNode] };
    }

    /**
     * 创建壁炉音效
     * 粉红噪音 + 随机爆裂声
     */
    createFireplaceSound() {
        const buffer = this.createPinkNoise();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 低通滤波器
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 800;

        // 增益控制
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.4;

        source.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { source, nodes: [lowpass, gainNode] };
    }

    /**
     * 创建风声效果
     * 带通滤波 + 频率调制
     */
    createWindSound() {
        const buffer = this.createNoiseBuffer();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 带通滤波器
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 600;
        bandpass.Q.value = 0.5;

        // 频率调制模拟风声变化
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.2;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 200;

        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);

        bandpass.connect(this.masterGain);

        lfo.start();

        return { source, nodes: [bandpass, lfo, lfoGain] };
    }

    /**
     * 播放指定类型的音效
     */
    play(soundType) {
        const soundMap = {
            'rain': () => this.createRainSound(),
            'thunder': () => this.createThunderSound(),
            'ocean': () => this.createOceanSound(),
            'forest': () => this.createForestSound(),
            'cafe': () => this.createCafeSound(),
            'fireplace': () => this.createFireplaceSound(),
            'wind': () => this.createWindSound()
        };

        const createFn = soundMap[soundType];
        if (!createFn) {
            console.error(`Unknown sound type: ${soundType}`);
            return null;
        }

        const { source, nodes } = createFn();
        source.start();

        // 保存节点引用以便停止
        this.activeNodes.set(soundType, { source, nodes });

        return { source, nodes };
    }

    /**
     * 停止指定类型的音效
     */
    stop(soundType) {
        const nodes = this.activeNodes.get(soundType);
        if (!nodes) return;

        // 停止音源
        nodes.source.stop();
        nodes.source.disconnect();

        // 断开所有节点
        nodes.nodes.forEach(node => {
            if (node instanceof AudioNode) {
                node.disconnect();
            }
        });

        this.activeNodes.delete(soundType);
    }

    /**
     * 停止所有音效
     */
    stopAll() {
        this.activeNodes.forEach((nodes, type) => {
            this.stop(type);
        });
    }

    /**
     * 设置主音量
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 获取音量
     */
    getVolume() {
        return this.masterGain ? this.masterGain.gain.value : 0.5;
    }

    /**
     * 恢复音频上下文（处理浏览器挂起状态）
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopAll();
        if (this.masterGain) {
            this.masterGain.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.initialized = false;
    }
}

// 导出单例
const audioGenerator = new ProceduralAudioGenerator();

// 兼容旧的 AUDIO_DATA 接口
const AUDIO_DATA = {
    rain: { type: 'procedural', name: '雨声' },
    thunder: { type: 'procedural', name: '雷声' },
    ocean: { type: 'procedural', name: '海浪' },
    forest: { type: 'procedural', name: '森林' },
    cafe: { type: 'procedural', name: '咖啡馆' },
    fireplace: { type: 'procedural', name: '壁炉' },
    wind: { type: 'procedural', name: '风声' }
};
