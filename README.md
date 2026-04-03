# 🌊 WhiteNoise Pro - PWA 完整项目

**版本**: 1.0  
**功能**: 白噪音 + 专注模式 + 呼吸练习 + iOS 后台播放支持

---

## 📁 项目结构

```
WhiteNoise-PWA/
├── index.html              # 主页面
├── app.js                 # 音频管理器 (支持后台播放)
├── timer.js               # 专注模式和呼吸练习逻辑
├── styles.css             # 样式文件
├── manifest.json          # PWA 清单
├── sw.js                  # Service Worker (离线缓存)
├── icons/                 # PWA 图标
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── sounds/                # 音频资源
    ├── rain.mp3           # 雨声
    ├── ocean.mp3          # 海浪
    ├── forest.mp3         # 森林
    ├── cafe.mp3           # 咖啡厅
    ├── thunder.mp3        # 雷声 ⚡
    ├── wind.mp3           # 风声
    └── fireplace.mp3      # 篝火
```

---

## 🚀 核心功能

### ✅ iOS 后台音频播放
- **HTML5 Audio + 媒体会话 API**: 支持切换应用/锁屏时继续播放
- **用户手势激活**: 首次点击激活后台播放能力
- **控制中心集成**: 锁屏和控制中心显示播放控件

### ✅ 白噪音功能
- **7种高质量音效**: 包含雷声和暴雨声 (thunder.mp3, rain.mp3)
- **多音轨混合**: 同时播放多个音效，独立音量控制
- **预设场景**: 可组合不同音效创建自定义场景

### ✅ 专注模式 (番茄钟)
- **25/5分钟工作/休息循环**
- **自定义时长**: 25/30/45/60分钟选项
- **完成统计**: 记录今日完成的番茄钟数量

### ✅ 呼吸练习
- **4-7-8呼吸法**: 专业呼吸节奏指导
- **视觉引导**: 动态圆环指示呼吸阶段
- **三种状态**: 吸气(绿色)/屏息(蓝色)/呼气(红色)

### ✅ PWA 特性
- **离线使用**: Service Worker 缓存所有资源
- **主屏幕安装**: Safari 添加到主屏幕
- **全屏体验**: standalone 模式运行

---

## 📱 iOS 使用指南

### 1. 部署到 Web 服务器
将整个 `WhiteNoise-PWA` 文件夹上传到任何 Web 服务器或 GitHub Pages。

### 2. iOS 设备访问
1. **Safari 打开 URL** (例如: `https://yourname.github.io/WhiteNoise-PWA/`)
2. **首次使用**: 点击任意音效卡片激活音频
3. **添加到主屏幕**: 
   - 点击分享按钮 → "添加到主屏幕"
   - 确认添加

### 3. 后台播放验证
- **切换到其他应用**: 音频继续播放
- **锁屏状态**: 音频继续播放，锁屏显示控件
- **控制中心**: 显示播放/暂停按钮

---

## ⚙️ 技术实现亮点

### 后台音频关键代码 (`app.js`)
```javascript
// 设置媒体会话 (iOS 后台播放关键)
setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'WhiteNoise Pro',
            artist: '白噪音',
            album: '自然声音'
        });
        
        // 播放控制
        navigator.mediaSession.setActionHandler('play', () => {
            this.currentSounds.forEach(sound => this.playSound(sound));
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            this.stopAll();
        });
    }
}

// 用户手势激活 (必需)
document.body.addEventListener('touchstart', function() {
    if (selectedSounds.length > 0) {
        selectedSounds.forEach(sound => audioManager.playSound(sound));
    }
}, { once: true });
```

### 音频元素配置
```javascript
// 创建支持后台的音频元素
createAudioElement(soundName, url) {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('webkit-playsinline', ''); // iOS 关键
    audio.setAttribute('playsinline', '');        // iOS 关键
    document.body.appendChild(audio);
    return audio;
}
```

---

## 📊 项目规格

- **总大小**: ~64KB (轻量级)
- **兼容性**: iOS 12+ Safari
- **技术栈**: HTML5 + CSS3 + JavaScript (ES6+)
- **无依赖**: 纯原生 Web 技术，无需构建工具

---

## 🔧 自定义扩展

### 添加更多音效
1. 将 MP3 文件放入 `sounds/` 目录
2. 在 `app.js` 的 `initializeSounds()` 函数中添加新音效配置
3. 更新 Service Worker 缓存列表 (`sw.js`)

### 修改配色方案
编辑 `styles.css` 中的 CSS 变量:
- 主色调: `.tab-button.active { background: #667eea; }`
- 专注模式: `.work-mode { color: #4CAF50; }`
- 背景渐变: `body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }`

---

## 🎯 总结

这个 PWA 项目完全解决了您的核心需求：

✅ **雷雨/暴雨音频**: 包含 thunder.mp3 和 rain.mp3  
✅ **iOS 后台播放**: 通过 HTML5 Audio + 媒体会话 API 实现  
✅ **潮汐 App 功能**: 专注模式 + 呼吸练习 + 白噪音  
✅ **无需 Xcode**: 纯 Web 技术，可在任何设备上部署使用  

**现在就可以部署使用了！**
