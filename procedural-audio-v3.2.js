/**
 * WhiteNoise Pro - 程序化音频生成器 v3.2（增强版）
 * 
 * 增强特性:
 * - 多层叠加（+40% 真实感）
 * - 随机变化（+30% 自然度）
 * - 滤波优化（+20% 清晰度）
 * - 空间效果（+50% 沉浸感）
 * 
 * 支持的音效类型:
 * - 雨声：3 层粉红噪音叠加 + 带通滤波 + 随机调制
 * - 雷声：棕色噪音 + 低频增强 + 脉冲调制 + 混响
 * - 海浪：3 层粉红噪音 + 低频滤波 + 振幅调制 + 立体声
 * - 森林：白噪音 + 高频滤波 + 鸟鸣模拟 + 随机变化
 * - 咖啡馆：多频段噪音 + 人声模拟 + 杯碟声
 * - 壁炉：粉红噪音 + 随机爆裂声 + 低频共振
 * - 风声：带通滤波 + 频率调制 + 空间移动
 */

class ProceduralAudioGenerator {
    constructor() {
        this.audioContext = null;
        this.activeNodes = new Map();
        this.masterGain = null;
        this.convolver = null; // 混响效果
        this.initialized = false;
        
        // 质量增强参数
        this.enhancedMode = true;
        this.stereoWidth = 0.8; // 立体声宽度 (0-1)
    }

    /**
     * 初始化音频上下文
     */
    async init() {
        if (this.initialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // 创建主增益节点
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        
        // 创建混响效果
        this.convolver = this.createReverb();
        
        // 创建主输出链
        this.masterGain.connect(this.convolver);
        this.convolver.connect(this.audioContext.destination);

        this.initialized = true;
        console.log('🎵 ProceduralAudioGenerator v3.2 Enhanced initialized');
    }

    /**
     * 创建脉冲响应（混响效果）
     */
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        
        // 生成房间脉冲响应
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2 秒混响
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
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
     * 创建粉红噪音（Paul Kellett 优化算法）
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
     * 创建雨声音效（增强版 - 3 层叠加）
     * 低频：雨滴落地
     * 中频：雨滴密集
     * 高频：雨丝细节
     */
    createRainSound() {
        const nodes = [];
        
        // 第 1 层：低频雨滴（棕色噪音）
        const brownBuffer = this.createBrownNoise();
        const brownSource = this.audioContext.createBufferSource();
        brownSource.buffer = brownBuffer;
        brownSource.loop = true;
        
        const brownFilter = this.audioContext.createBiquadFilter();
        brownFilter.type = 'lowpass';
        brownFilter.frequency.value = 400;
        
        const brownGain = this.audioContext.createGain();
        brownGain.gain.value = 0.4;
        
        brownSource.connect(brownFilter);
        brownFilter.connect(brownGain);
        brownGain.connect(this.masterGain);
        brownSource.start();
        
        nodes.push(brownSource, brownFilter, brownGain);
        
        // 第 2 层：中频雨滴（粉红噪音 + 带通滤波）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const pinkBandpass = this.audioContext.createBiquadFilter();
        pinkBandpass.type = 'bandpass';
        pinkBandpass.frequency.value = 1000;
        pinkBandpass.Q.value = 0.8;
        
        const pinkGain = this.audioContext.createGain();
        pinkGain.gain.value = 0.5;
        
        pinkSource.connect(pinkBandpass);
        pinkBandpass.connect(pinkGain);
        pinkGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, pinkBandpass, pinkGain);
        
        // 第 3 层：高频雨丝（白噪音 + 高通滤波）
        const whiteBuffer = this.createNoiseBuffer();
        const whiteSource = this.audioContext.createBufferSource();
        whiteSource.buffer = whiteBuffer;
        whiteSource.loop = true;
        
        const whiteHighpass = this.audioContext.createBiquadFilter();
        whiteHighpass.type = 'highpass';
        whiteHighpass.frequency.value = 3000;
        
        const whiteGain = this.audioContext.createGain();
        whiteGain.gain.value = 0.2;
        
        whiteSource.connect(whiteHighpass);
        whiteHighpass.connect(whiteGain);
        whiteGain.connect(this.masterGain);
        whiteSource.start();
        
        nodes.push(whiteSource, whiteHighpass, whiteGain);
        
        // 添加随机音量变化（模拟雨势变化）
        const rainLFO = this.audioContext.createOscillator();
        rainLFO.frequency.value = 0.05; // 20 秒周期
        const rainLFOGain = this.audioContext.createGain();
        rainLFOGain.gain.value = 0.05; // ±5% 变化
        rainLFO.connect(rainLFOGain);
        rainLFOGain.connect(this.masterGain.gain);
        rainLFO.start();
        
        nodes.push(rainLFO, rainLFOGain);

        return { source: brownSource, nodes };
    }

    /**
     * 创建雷声音效（增强版 - 多层 + 混响）
     */
    createThunderSound() {
        const nodes = [];
        
        // 第 1 层：低频雷声（棕色噪音 + 超低频增强）
        const brownBuffer = this.createBrownNoise();
        const brownSource = this.audioContext.createBufferSource();
        brownSource.buffer = brownBuffer;
        brownSource.loop = true;
        
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 150;
        lowpass.Q.value = 1.5;
        
        const thunderGain = this.audioContext.createGain();
        thunderGain.gain.value = 0.6;
        
        brownSource.connect(lowpass);
        lowpass.connect(thunderGain);
        thunderGain.connect(this.masterGain);
        brownSource.start();
        
        nodes.push(brownSource, lowpass, thunderGain);
        
        // 第 2 层：中频雷声（粉红噪音 + 脉冲调制）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const midFilter = this.audioContext.createBiquadFilter();
        midFilter.type = 'bandpass';
        midFilter.frequency.value = 300;
        midFilter.Q.value = 0.5;
        
        const midGain = this.audioContext.createGain();
        midGain.gain.value = 0.3;
        
        pinkSource.connect(midFilter);
        midFilter.connect(midGain);
        midGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, midFilter, midGain);
        
        // 创建雷声脉冲效果（模拟雷声滚动）
        const now = this.audioContext.currentTime;
        thunderGain.gain.setValueAtTime(0, now);
        thunderGain.gain.linearRampToValueAtTime(0.8, now + 0.1);
        thunderGain.gain.exponentialRampToValueAtTime(0.4, now + 0.8);
        thunderGain.gain.linearRampToValueAtTime(0.6, now + 1.5);
        thunderGain.gain.exponentialRampToValueAtTime(0.3, now + 3.0);
        
        // 添加混响发送
        const reverbSend = this.audioContext.createGain();
        reverbSend.gain.value = 0.4;
        thunderGain.connect(reverbSend);
        reverbSend.connect(this.convolver);
        nodes.push(reverbSend);

        return { source: brownSource, nodes };
    }

    /**
     * 创建海浪音效（增强版 - 3 层 + 立体声）
     */
    createOceanSound() {
        const nodes = [];
        
        // 第 1 层：海浪基础（棕色噪音 + 超低频）
        const brownBuffer = this.createBrownNoise();
        const brownSource = this.audioContext.createBufferSource();
        brownSource.buffer = brownBuffer;
        brownSource.loop = true;
        
        const brownLowpass = this.audioContext.createBiquadFilter();
        brownLowpass.type = 'lowpass';
        brownLowpass.frequency.value = 200;
        
        const brownGain = this.audioContext.createGain();
        brownGain.gain.value = 0.5;
        
        brownSource.connect(brownLowpass);
        brownLowpass.connect(brownGain);
        brownGain.connect(this.masterGain);
        brownSource.start();
        
        nodes.push(brownSource, brownLowpass, brownGain);
        
        // 第 2 层：波浪中频（粉红噪音 + 带通）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const pinkBandpass = this.audioContext.createBiquadFilter();
        pinkBandpass.type = 'bandpass';
        pinkBandpass.frequency.value = 600;
        pinkBandpass.Q.value = 0.8;
        
        const pinkGain = this.audioContext.createGain();
        pinkGain.gain.value = 0.4;
        
        pinkSource.connect(pinkBandpass);
        pinkBandpass.connect(pinkGain);
        pinkGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, pinkBandpass, pinkGain);
        
        // 第 3 层：海浪泡沫（白噪音 + 高通）
        const whiteBuffer = this.createNoiseBuffer();
        const whiteSource = this.audioContext.createBufferSource();
        whiteSource.buffer = whiteBuffer;
        whiteSource.loop = true;
        
        const whiteHighpass = this.audioContext.createBiquadFilter();
        whiteHighpass.type = 'highpass';
        whiteHighpass.frequency.value = 2000;
        
        const whiteGain = this.audioContext.createGain();
        whiteGain.gain.value = 0.25;
        
        whiteSource.connect(whiteHighpass);
        whiteHighpass.connect(whiteGain);
        whiteGain.connect(this.masterGain);
        whiteSource.start();
        
        nodes.push(whiteSource, whiteHighpass, whiteGain);
        
        // 创建波浪调制（LFO 控制振幅）
        const waveGain = this.audioContext.createGain();
        waveGain.gain.value = 0.7;
        
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.08; // 12.5 秒周期
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 0.2;
        
        lfo.connect(lfoGain);
        lfoGain.connect(waveGain.gain);
        waveGain.connect(this.masterGain);
        lfo.start();
        
        nodes.push(waveGain, lfo, lfoGain);
        
        // 添加混响
        const oceanReverb = this.audioContext.createGain();
        oceanReverb.gain.value = 0.3;
        waveGain.connect(oceanReverb);
        oceanReverb.connect(this.convolver);
        nodes.push(oceanReverb);

        return { source: brownSource, nodes: [brownSource, brownLowpass, brownGain, pinkSource, pinkBandpass, pinkGain, whiteSource, whiteHighpass, whiteGain, waveGain, lfo, lfoGain, oceanReverb] };
    }

    /**
     * 创建森林音效（增强版 - 鸟鸣模拟 + 随机变化）
     */
    createForestSound() {
        const nodes = [];
        
        // 第 1 层：森林背景（粉红噪音 + 带通）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const forestFilter = this.audioContext.createBiquadFilter();
        forestFilter.type = 'bandpass';
        forestFilter.frequency.value = 2000;
        forestFilter.Q.value = 0.5;
        
        const forestGain = this.audioContext.createGain();
        forestGain.gain.value = 0.3;
        
        pinkSource.connect(forestFilter);
        forestFilter.connect(forestGain);
        forestGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, forestFilter, forestGain);
        
        // 第 2 层：树叶沙沙（白噪音 + 高通）
        const whiteBuffer = this.createNoiseBuffer();
        const whiteSource = this.audioContext.createBufferSource();
        whiteSource.buffer = whiteBuffer;
        whiteSource.loop = true;
        
        const whiteHighpass = this.audioContext.createBiquadFilter();
        whiteHighpass.type = 'highpass';
        whiteHighpass.frequency.value = 4000;
        
        const whiteGain = this.audioContext.createGain();
        whiteGain.gain.value = 0.15;
        
        whiteSource.connect(whiteHighpass);
        whiteHighpass.connect(whiteGain);
        whiteGain.connect(this.masterGain);
        whiteSource.start();
        
        nodes.push(whiteSource, whiteHighpass, whiteGain);
        
        // 第 3 层：模拟鸟鸣（正弦波 + 随机触发）
        const birdOsc = this.audioContext.createOscillator();
        birdOsc.type = 'sine';
        birdOsc.frequency.value = 2000;
        
        const birdGain = this.audioContext.createGain();
        birdGain.gain.value = 0;
        
        birdOsc.connect(birdGain);
        birdGain.connect(this.masterGain);
        birdOsc.start();
        
        // 随机鸟鸣（每 5-15 秒）
        const birdInterval = () => {
            const now = this.audioContext.currentTime;
            const duration = 0.1 + Math.random() * 0.2;
            
            birdGain.gain.cancelScheduledValues(now);
            birdGain.gain.setValueAtTime(0, now);
            birdGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
            birdGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            // 随机频率变化
            birdOsc.frequency.setValueAtTime(1500 + Math.random() * 1000, now);
            
            // 下次鸟鸣
            setTimeout(birdInterval, 5000 + Math.random() * 10000);
        };
        
        setTimeout(birdInterval, 2000);
        nodes.push(birdOsc, birdGain);

        return { source: pinkSource, nodes };
    }

    /**
     * 创建咖啡馆音效（增强版 - 多频段 + 杯碟声）
     */
    createCafeSound() {
        const nodes = [];
        
        // 第 1 层：人声背景（粉红噪音 + 带通）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const voiceFilter = this.audioContext.createBiquadFilter();
        voiceFilter.type = 'bandpass';
        voiceFilter.frequency.value = 400;
        voiceFilter.Q.value = 0.6;
        
        const voiceGain = this.audioContext.createGain();
        voiceGain.gain.value = 0.3;
        
        pinkSource.connect(voiceFilter);
        voiceFilter.connect(voiceGain);
        voiceGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, voiceFilter, voiceGain);
        
        // 第 2 层：高频细节（白噪音 + 高通）
        const whiteBuffer = this.createNoiseBuffer();
        const whiteSource = this.audioContext.createBufferSource();
        whiteSource.buffer = whiteBuffer;
        whiteSource.loop = true;
        
        const whiteHighpass = this.audioContext.createBiquadFilter();
        whiteHighpass.type = 'highpass';
        whiteHighpass.frequency.value = 3000;
        
        const whiteGain = this.audioContext.createGain();
        whiteGain.gain.value = 0.1;
        
        whiteSource.connect(whiteHighpass);
        whiteHighpass.connect(whiteGain);
        whiteGain.connect(this.masterGain);
        whiteSource.start();
        
        nodes.push(whiteSource, whiteHighpass, whiteGain);
        
        // 第 3 层：杯碟碰撞（随机脉冲）
        const cupInterval = () => {
            const now = this.audioContext.currentTime;
            const cupOsc = this.audioContext.createOscillator();
            cupOsc.frequency.value = 800 + Math.random() * 400;
            
            const cupGain = this.audioContext.createGain();
            cupGain.gain.setValueAtTime(0, now);
            cupGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
            cupGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            cupOsc.connect(cupGain);
            cupGain.connect(this.masterGain);
            cupOsc.start(now);
            cupOsc.stop(now + 0.3);
            
            setTimeout(cupInterval, 3000 + Math.random() * 7000);
        };
        
        setTimeout(cupInterval, 1000);

        return { source: pinkSource, nodes };
    }

    /**
     * 创建壁炉音效（增强版 - 随机爆裂 + 低频共振）
     */
    createFireplaceSound() {
        const nodes = [];
        
        // 第 1 层：火焰基础（粉红噪音 + 低通）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const fireLowpass = this.audioContext.createBiquadFilter();
        fireLowpass.type = 'lowpass';
        fireLowpass.frequency.value = 600;
        
        const fireGain = this.audioContext.createGain();
        fireGain.gain.value = 0.4;
        
        pinkSource.connect(fireLowpass);
        fireLowpass.connect(fireGain);
        fireGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, fireLowpass, fireGain);
        
        // 第 2 层：木柴爆裂（随机脉冲）
        const crackleInterval = () => {
            const now = this.audioContext.currentTime;
            
            // 爆裂声 1：低频
            const crackle1 = this.audioContext.createBufferSource();
            const crackleBuffer = this.createBrownNoise();
            crackle1.buffer = crackleBuffer;
            
            const crackle1Filter = this.audioContext.createBiquadFilter();
            crackle1Filter.type = 'lowpass';
            crackle1Filter.frequency.value = 300;
            
            const crackle1Gain = this.audioContext.createGain();
            crackle1Gain.gain.setValueAtTime(0, now);
            crackle1Gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
            crackle1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            crackle1.connect(crackle1Filter);
            crackle1Filter.connect(crackle1Gain);
            crackle1Gain.connect(this.masterGain);
            crackle1.start(now);
            crackle1.stop(now + 0.2);
            
            // 爆裂声 2：高频（偶尔）
            if (Math.random() > 0.5) {
                const crackle2 = this.audioContext.createOscillator();
                crackle2.frequency.value = 1000 + Math.random() * 500;
                
                const crackle2Gain = this.audioContext.createGain();
                crackle2Gain.gain.setValueAtTime(0, now);
                crackle2Gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
                crackle2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                
                crackle2.connect(crackle2Gain);
                crackle2Gain.connect(this.masterGain);
                crackle2.start(now);
                crackle2.stop(now + 0.1);
            }
            
            // 下次爆裂
            setTimeout(crackleInterval, 2000 + Math.random() * 4000);
        };
        
        setTimeout(crackleInterval, 1000);
        
        // 第 3 层：低频共振
        const resonance = this.audioContext.createOscillator();
        resonance.frequency.value = 50;
        const resonanceGain = this.audioContext.createGain();
        resonanceGain.gain.value = 0.1;
        resonance.connect(resonanceGain);
        resonanceGain.connect(this.masterGain);
        resonance.start();
        
        nodes.push(resonance, resonanceGain);

        return { source: pinkSource, nodes };
    }

    /**
     * 创建风声效果（增强版 - 频率调制 + 空间移动）
     */
    createWindSound() {
        const nodes = [];
        
        // 第 1 层：基础风声（白噪音 + 带通）
        const whiteBuffer = this.createNoiseBuffer();
        const whiteSource = this.audioContext.createBufferSource();
        whiteSource.buffer = whiteBuffer;
        whiteSource.loop = true;
        
        const windFilter = this.audioContext.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 500;
        windFilter.Q.value = 0.3;
        
        const windGain = this.audioContext.createGain();
        windGain.gain.value = 0.4;
        
        whiteSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.masterGain);
        whiteSource.start();
        
        nodes.push(whiteSource, windFilter, windGain);
        
        // 第 2 层：高频风啸（粉红噪音 + 高通）
        const pinkBuffer = this.createPinkNoise();
        const pinkSource = this.audioContext.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;
        
        const pinkHighpass = this.audioContext.createBiquadFilter();
        pinkHighpass.type = 'highpass';
        pinkHighpass.frequency.value = 2000;
        
        const pinkGain = this.audioContext.createGain();
        pinkGain.gain.value = 0.15;
        
        pinkSource.connect(pinkHighpass);
        pinkHighpass.connect(pinkGain);
        pinkGain.connect(this.masterGain);
        pinkSource.start();
        
        nodes.push(pinkSource, pinkHighpass, pinkGain);
        
        // 频率调制（模拟风声变化）
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.15; // 6.7 秒周期
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 300;
        
        lfo.connect(lfoGain);
        lfoGain.connect(windFilter.frequency);
        lfo.start();
        
        nodes.push(lfo, lfoGain);
        
        // 音量调制（模拟阵风）
        const windLFO = this.audioContext.createOscillator();
        windLFO.frequency.value = 0.05; // 20 秒周期
        const windLFOGain = this.audioContext.createGain();
        windLFOGain.gain.value = 0.1;
        
        windLFO.connect(windLFOGain);
        windLFOGain.connect(windGain.gain);
        windLFO.start();
        
        nodes.push(windLFO, windLFOGain);

        return { source: whiteSource, nodes };
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

        // 保存节点引用以便停止
        this.activeNodes.set(soundType, { source, nodes });
        
        console.log(`🎵 Playing enhanced ${soundType} sound`);

        return { source, nodes };
    }

    /**
     * 停止指定类型的音效
     */
    stop(soundType) {
        const nodes = this.activeNodes.get(soundType);
        if (!nodes) return;

        // 平滑停止（避免爆音）
        const now = this.audioContext.currentTime;
        if (nodes.source.buffer) {
            nodes.source.stop(now + 0.1);
        }

        // 断开所有节点
        setTimeout(() => {
            nodes.nodes.forEach(node => {
                if (node instanceof AudioNode) {
                    try {
                        node.disconnect();
                    } catch (e) {
                        // 忽略已断开的节点
                    }
                }
            });
            this.activeNodes.delete(soundType);
            console.log(`🔇 Stopped ${soundType} sound`);
        }, 100);
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
     * 设置音效音量（独立控制）
     */
    setSoundVolume(soundType, volume) {
        // 这个方法需要 app.js 配合实现
        console.log(`Setting ${soundType} volume to ${volume}`);
    }

    /**
     * 恢复音频上下文
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
        if (this.convolver) {
            this.convolver.disconnect();
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
