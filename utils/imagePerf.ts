import { trace as createTrace, getPerformance } from '@react-native-firebase/perf';

interface ImageTraceAttrs {
  component: string;
  imageType: 'thumbnail' | 'mainImage';
  renderer: 'expo-image' | 'RNImage';
  id?: string;
  index?: number;
}

export interface ImageTraceHandle {
  stop: (success: boolean, width?: number, height?: number) => number;
}

/**
 * Start a Firebase Performance trace for an image load.
 * Returns a handle with `stop(success, width?, height?)` to finish the trace.
 */
export function startImageTrace(attrs: ImageTraceAttrs): ImageTraceHandle {
  const startTime = Date.now();
  const traceName = `image_load_${attrs.component}_${attrs.imageType}`;

  // Fire-and-forget async trace — we don't want to block rendering
  const tracePromise = (async () => {
    const t = createTrace(getPerformance(), traceName);
    await t.start();
    t.putAttribute('component', attrs.component);
    t.putAttribute('imageType', attrs.imageType);
    t.putAttribute('renderer', attrs.renderer);
    if (attrs.id != null) t.putAttribute('id', String(attrs.id));
    if (attrs.index != null) t.putAttribute('index', String(attrs.index));
    return t;
  })();

  return {
    stop: (success: boolean, width?: number, height?: number) => {
      const duration = Date.now() - startTime;
      tracePromise
        .then((trace) => {
          trace.putMetric('duration_ms', duration);
          if (width != null) trace.putMetric('width', width);
          if (height != null) trace.putMetric('height', height);
          trace.putAttribute('success', String(success));
          trace.stop();
        })
        .catch(() => {
          // Perf tracing is best-effort — don't crash the app
        });
      return duration;
    },
  };
}
