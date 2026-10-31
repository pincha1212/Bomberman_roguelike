import { useState, useEffect, useCallback } from 'react';

export interface UseDynamicCanvasSizeOptions {
  canvasId?: string;
  containerId?: string;
  stageId?: string;
  maintainAspectRatio?: boolean;
  minSize?: number;
  padding?: number;
  touchOnly?: boolean;
}

export interface DynamicCanvasState {
  canvasSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  recalculate: () => void;
}

/**
 * Hook de React que detecta el tamaño de la pantalla en tiempo real y
 * ajusta dinámicamente las propiedades de ancho y alto (width y height)
 * del elemento 'gameCanvas' para que ocupe el máximo espacio disponible
 * en dispositivos táctiles (tablets, smartphones y pantallas táctiles).
 */
export function useDynamicCanvasSize(options: UseDynamicCanvasSizeOptions = {}): DynamicCanvasState {
  const {
    canvasId = 'gameCanvas',
    containerId = 'game-container',
    stageId = 'game-stage',
    maintainAspectRatio = true,
    minSize = 280,
    padding = 10,
    touchOnly = false
  } = options;

  const [state, setState] = useState<Omit<DynamicCanvasState, 'recalculate'>>({
    canvasSize: { width: 600, height: 600 },
    viewportSize: {
      width: typeof window !== 'undefined' ? window.innerWidth : 600,
      height: typeof window !== 'undefined' ? window.innerHeight : 600
    },
    isTouchDevice: false,
    orientation: 'landscape'
  });

  const checkIsTouchDevice = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const hasTouchStart = 'ontouchstart' in window;
    const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints > 0 : false;
    const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const noHover = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
    return Boolean(hasTouchStart || maxTouchPoints || coarsePointer || noHover);
  }, []);

  const adjustCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const isTouch = checkIsTouchDevice();
    const vw = window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth;
    const vh = window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight;
    const orientation: 'portrait' | 'landscape' = vw >= vh ? 'landscape' : 'portrait';

    // Si touchOnly está activo y no es dispositivo táctil, no forzamos reescalado agresivo
    if (touchOnly && !isTouch) {
      setState(prev => ({
        ...prev,
        viewportSize: { width: vw, height: vh },
        isTouchDevice: isTouch,
        orientation
      }));
      return;
    }

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    const container = document.getElementById(containerId) as HTMLElement | null;
    const stage = document.getElementById(stageId) as HTMLElement | null;

    if (!canvas) return;

    // Calculamos el espacio disponible
    let availW = vw;
    let availH = vh;

    if (stage) {
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width > 50 && stageRect.height > 50) {
        availW = Math.round(stageRect.width);
        availH = Math.round(stageRect.height);
      }
    }

    // Descontamos márgenes de seguridad para controles y bordes del dispositivo
    const effectivePadding = isTouch ? Math.max(6, padding) : padding * 1.5;
    let targetW = Math.max(minSize, availW - effectivePadding * 2);
    let targetH = Math.max(minSize, availH - effectivePadding * 2);

    // En dispositivos móviles y tablets en vertical (portrait), consideramos el panel inferior/superior
    if (orientation === 'portrait' && isTouch) {
      // Dejamos margen para no desbordar verticalmente
      targetH = Math.min(targetH, vh - 60);
    }

    // Si Bomberman requiere cuadrícula 1:1, calculamos el cuadrado máximo posible
    if (maintainAspectRatio) {
      const maxSquare = Math.floor(Math.min(targetW, targetH));
      targetW = maxSquare;
      targetH = maxSquare;
    }

    // 1. Ajuste de las propiedades DOM directas de HTMLCanvasElement (canvas.width y canvas.height)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;

      // Al cambiar width/height el canvas resetea su contexto 2D. Restauramos suavizado pixelado.
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
      }
    }

    // 2. Ajuste de los estilos CSS inline del canvas
    canvas.style.setProperty('width', `${targetW}px`, 'important');
    canvas.style.setProperty('height', `${targetH}px`, 'important');
    canvas.style.setProperty('aspect-ratio', '1 / 1', 'important');
    canvas.style.setProperty('display', 'block', 'important');

    // 3. Ajuste del contenedor padre para que envuelva el canvas exactamente
    if (container) {
      container.style.width = `${targetW}px`;
      container.style.height = `${targetH}px`;
      container.style.maxWidth = `${targetW}px`;
      container.style.maxHeight = `${targetH}px`;
      container.style.flex = '0 0 auto';
    }

    setState({
      canvasSize: { width: targetW, height: targetH },
      viewportSize: { width: vw, height: vh },
      isTouchDevice: isTouch,
      orientation
    });

    // Notificamos al motor de juego si escucha eventos personalizados de redimensionamiento
    window.dispatchEvent(new CustomEvent('bomberman_canvas_resized', {
      detail: { width: targetW, height: targetH, isTouch, orientation }
    }));
  }, [canvasId, containerId, stageId, maintainAspectRatio, minSize, padding, touchOnly, checkIsTouchDevice]);

  useEffect(() => {
    adjustCanvasDimensions();

    const handleResize = () => {
      adjustCanvasDimensions();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    // ResizeObserver para detectar cambios de dimensiones en el contenedor y layout
    let stageObserver: ResizeObserver | null = null;
    const stageEl = document.getElementById(stageId);
    if (typeof ResizeObserver !== 'undefined' && stageEl) {
      stageObserver = new ResizeObserver(() => {
        adjustCanvasDimensions();
      });
      stageObserver.observe(stageEl);
    }

    // También reajustamos con un pequeño retraso al montar para esperar que el DOM se asiente
    const timer1 = setTimeout(adjustCanvasDimensions, 50);
    const timer2 = setTimeout(adjustCanvasDimensions, 250);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (stageObserver) {
        stageObserver.disconnect();
      }
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [adjustCanvasDimensions, stageId]);

  return {
    ...state,
    recalculate: adjustCanvasDimensions
  };
}
