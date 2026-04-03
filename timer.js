// 专注模式计时器
class FocusTimer {
    constructor() {
        this.isRunning = false;
        this.currentTime = 0;
        this.totalTime = 25 * 60; // 25分钟默认
        this.mode = 'work'; // work/break
        this.sessionsCompleted = 0;
        this.timer = null;
    }

    start() {
        this.isRunning = true;
        this.timer = setInterval(() => {
            if (this.currentTime >= this.totalTime) {
                this.switchMode();
            } else {
                this.currentTime++;
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    reset() {
        this.pause();
        this.currentTime = 0;
        this.mode = 'work';
    }

    switchMode() {
        if (this.mode === 'work') {
            this.mode = 'break';
            this.totalTime = 5 * 60;
            this.currentTime = 0;
            this.sessionsCompleted++;
        } else {
            this.mode = 'work';
            this.totalTime = 25 * 60;
            this.currentTime = 0;
        }
    }

    setDuration(minutes) {
        this.totalTime = minutes * 60;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// 呼吸练习
class BreathingExercise {
    constructor() {
        this.isRunning = false;
        this.currentPhase = 'inhale'; // inhale/hold/exhale
        this.timeRemaining = 4;
        this.inhaleDuration = 4.0;
        this.holdDuration = 7.0;
        this.exhaleDuration = 8.0;
        this.timer = null;
    }

    start() {
        this.isRunning = true;
        this.timer = setInterval(() => {
            if (this.timeRemaining <= 0) {
                this.advancePhase();
            } else {
                this.timeRemaining -= 0.1;
            }
        }, 100);
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    advancePhase() {
        switch (this.currentPhase) {
            case 'inhale':
                this.currentPhase = 'hold';
                this.timeRemaining = this.holdDuration;
                break;
            case 'hold':
                this.currentPhase = 'exhale';
                this.timeRemaining = this.exhaleDuration;
                break;
            case 'exhale':
                this.currentPhase = 'inhale';
                this.timeRemaining = this.inhaleDuration;
                break;
        }
    }

    getPhaseText() {
        switch (this.currentPhase) {
            case 'inhale': return '吸气';
            case 'hold': return '屏息';
            case 'exhale': return '呼气';
        }
    }

    getPhaseColor() {
        switch (this.currentPhase) {
            case 'inhale': return '#4CAF50'; // 绿色
            case 'hold': return '#2196F3';   // 蓝色
            case 'exhale': return '#F44336'; // 红色
        }
    }

    getPhaseDuration() {
        switch (this.currentPhase) {
            case 'inhale': return this.inhaleDuration;
            case 'hold': return this.holdDuration;
            case 'exhale': return this.exhaleDuration;
        }
    }
}