/**
 * 浏览器指纹生成工具
 * 使用 FingerprintJS 生成稳定的访客 ID
 */

// FingerprintJS CDN 地址
const FPJS_SCRIPT_URL = 'https://openfpcdn.io/fingerprintjs/v4';

/**
 * 加载 FingerprintJS 脚本
 */
function loadScript() {
    return new Promise((resolve, reject) => {
        // 如果已加载，直接返回
        if (window.FingerprintJS) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = FPJS_SCRIPT_URL;
        script.onload = resolve;
        script.onerror = () => reject(new Error('无法加载指纹识别脚本'));
        document.head.appendChild(script);
    });
}

/**
 * 获取访客 ID
 * @returns {Promise<string>} 访客指纹 ID
 */
export async function getVisitorId() {
    try {
        await loadScript();
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        return result.visitorId;
    } catch (error) {
        // 如果 FingerprintJS 加载失败，使用备用方案
        console.warn('FingerprintJS 加载失败，使用备用指纹方案:', error.message);
        return generateFallbackId();
    }
}

/**
 * 备用指纹生成方案
 * 基于浏览器基本特征生成一个相对稳定的 ID
 */
function generateFallbackId() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ];

    // 简单哈希
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转为 32 位整数
    }

    return 'fallback_' + Math.abs(hash).toString(36);
}
