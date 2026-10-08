(function () {
    'use strict';

    const SVG_ASSET_BASE = 'assets/svg/';
    const svgImageCache = new Map();

    function loadSvgAssetV620(name) {
        if (!name) return Promise.reject(new Error('SVG asset name requerido'));
        if (svgImageCache.has(name)) return svgImageCache.get(name);
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar SVG: ' + name));
            img.src = SVG_ASSET_BASE + name + '.svg';
        });
        svgImageCache.set(name, promise);
        return promise;
    }

    function drawSvgAssetV620(ctx, name, x, y, width, height, alpha = 1) {
        if (!ctx || !name) return false;
        loadSvgAssetV620(name).then(img => {
            if (!ctx.canvas || !img.complete) return;
            ctx.save();
            ctx.globalAlpha *= alpha;
            ctx.drawImage(img, x, y, width, height);
            ctx.restore();
        }).catch(() => {});
        return true;
    }

    function mountSvgUiV620() {
        if (document.getElementById('svg-ui-layer')) return;
        const layer = document.createElement('div');
        layer.id = 'svg-ui-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.innerHTML = `
            <svg class="svg-ui-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="svg-vignette-v620" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#ffffff" stop-opacity="0.06"/>
                        <stop offset="0.72" stop-color="#ffffff" stop-opacity="0"/>
                        <stop offset="1" stop-color="#000000" stop-opacity="0.10"/>
                    </linearGradient>
                </defs>
                <rect width="100" height="100" fill="url(#svg-vignette-v620)"/>
            </svg>`;
        const gameRoot = document.querySelector('#game-container, #game, main') || document.body;
        gameRoot.appendChild(layer);
    }

    function upgradeMobileButtonsToSvgV620() {
        const icons = { up: '↑', left: '←', down: '↓', right: '→' };
        document.querySelectorAll('[data-mobile-dir]').forEach(button => {
            const dir = button.getAttribute('data-mobile-dir');
            if (!icons[dir] || button.dataset.svgEnhanced === '1') return;
            button.textContent = '';
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = `<path d="M12 3 L20 11 H15 V21 H9 V11 H4 Z"/>`;
            if (dir === 'left' || dir === 'right') {
                svg.style.transform = `rotate(${dir === 'left' ? '-90' : '90'}deg)`;
            }
            button.appendChild(svg);
            button.dataset.svgEnhanced = '1';
        });

        const bomb = document.getElementById('btn-bomb-mobile');
        if (bomb && bomb.dataset.svgEnhanced !== '1') {
            bomb.textContent = '';
            bomb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="13" r="7"/><path d="M16 7l3-3M17 4h3v3"/></svg>';
            bomb.dataset.svgEnhanced = '1';
        }
    }

    window.loadSvgAssetV620 = loadSvgAssetV620;
    window.drawSvgAssetV620 = drawSvgAssetV620;
    window.mountSvgUiV620 = mountSvgUiV620;

    document.addEventListener('DOMContentLoaded', () => {
        mountSvgUiV620();
        upgradeMobileButtonsToSvgV620();
    });
})();
