'use client';

import { useEffect, useState, useCallback } from 'react';

// Global state for performance tracking (outside React to persist across renders)
interface PerformanceState {
  cacheHits: number;
  cacheMisses: number;
  loadTimes: number[];
  lastLoadSource: 'cache' | 'network' | null;
}

const perfState: PerformanceState = {
  cacheHits: 0,
  cacheMisses: 0,
  loadTimes: [],
  lastLoadSource: null,
};

// Keep only last 50 load times to prevent memory growth
const MAX_LOAD_TIMES = 50;

// Subscribers for reactive updates
type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

function notifySubscribers() {
  subscribers.forEach(sub => sub());
}

// ===== PUBLIC TRACKING API =====

/**
 * Track when data is loaded from cache (cache hit)
 */
export function trackCacheHit() {
  perfState.cacheHits++;
  perfState.lastLoadSource = 'cache';
  console.log('🎯 Cache HIT - Total hits:', perfState.cacheHits);
  notifySubscribers();
}

/**
 * Track when data must be fetched from network (cache miss)
 */
export function trackCacheMiss() {
  perfState.cacheMisses++;
  perfState.lastLoadSource = 'network';
  console.log('📡 Cache MISS - Total misses:', perfState.cacheMisses);
  notifySubscribers();
}

/**
 * Track load time for a data fetch operation
 * @param startTime - performance.now() value from when the load started
 * @param source - whether data came from 'cache' or 'network'
 * @returns The load time in milliseconds
 */
export function trackLoadTime(startTime: number, source: 'cache' | 'network'): number {
  const loadTime = performance.now() - startTime;

  perfState.loadTimes.push(loadTime);
  perfState.lastLoadSource = source;

  // Trim to prevent memory growth
  if (perfState.loadTimes.length > MAX_LOAD_TIMES) {
    perfState.loadTimes = perfState.loadTimes.slice(-MAX_LOAD_TIMES);
  }

  const emoji = source === 'cache' ? '⚡' : '🌐';
  console.log(`${emoji} ${source.toUpperCase()} load time: ${loadTime.toFixed(2)}ms`);

  notifySubscribers();
  return loadTime;
}

/**
 * Reset all performance metrics
 */
export function resetPerformanceMetrics() {
  perfState.cacheHits = 0;
  perfState.cacheMisses = 0;
  perfState.loadTimes = [];
  perfState.lastLoadSource = null;
  console.log('🔄 Performance metrics reset');
  notifySubscribers();
}

// ===== REACT HOOK =====

/**
 * Hook to subscribe to performance metric updates
 */
function usePerformanceMetrics() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const subscriber = () => forceUpdate({});
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  const total = perfState.cacheHits + perfState.cacheMisses;
  const cacheHitRate = total > 0 ? (perfState.cacheHits / total) * 100 : 0;
  const averageLoadTime = perfState.loadTimes.length > 0
    ? perfState.loadTimes.reduce((a, b) => a + b, 0) / perfState.loadTimes.length
    : 0;

  return {
    cacheHits: perfState.cacheHits,
    cacheMisses: perfState.cacheMisses,
    cacheHitRate,
    loadTimes: perfState.loadTimes,
    averageLoadTime,
    totalLoads: perfState.loadTimes.length,
    lastLoadSource: perfState.lastLoadSource,
  };
}

// ===== COMPONENT =====

export function PerformanceMonitor() {
  const metrics = usePerformanceMetrics();
  const [showMonitor, setShowMonitor] = useState(false);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);

  useEffect(() => {
    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerActive(true);
      }).catch(() => {
        setIsServiceWorkerActive(false);
      });
    }
  }, []);

  // Toggle monitor visibility with Ctrl+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowMonitor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!showMonitor) return null;

  // Determine status indicator color
  const getHealthColor = () => {
    if (metrics.cacheHitRate >= 80) return 'text-green-400';
    if (metrics.cacheHitRate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg border border-gray-700 shadow-lg min-w-[280px] font-mono text-xs">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          🚀 Performance Monitor
          <span className={`w-2 h-2 rounded-full ${metrics.cacheHitRate >= 50 ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
        </h3>
        <button
          onClick={() => setShowMonitor(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* Service Worker Status */}
        <div className="flex justify-between">
          <span className="text-gray-400">Service Worker:</span>
          <span className={isServiceWorkerActive ? 'text-green-400' : 'text-red-400'}>
            {isServiceWorkerActive ? '● Active' : '○ Inactive'}
          </span>
        </div>

        {/* Cache Hit Rate - Main Metric */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Cache Hit Rate:</span>
          <span className={`font-bold ${getHealthColor()}`}>
            {metrics.cacheHitRate.toFixed(1)}%
          </span>
        </div>

        {/* Hit/Miss Breakdown */}
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">
            Hits: {metrics.cacheHits} | Misses: {metrics.cacheMisses}
          </span>
        </div>

        <div className="border-t border-gray-700 my-2" />

        {/* Load Times */}
        <div className="flex justify-between">
          <span className="text-gray-400">Avg Load Time:</span>
          <span className={metrics.averageLoadTime < 100 ? 'text-green-400' : metrics.averageLoadTime < 300 ? 'text-yellow-400' : 'text-red-400'}>
            {metrics.averageLoadTime.toFixed(1)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Total Loads:</span>
          <span>{metrics.totalLoads}</span>
        </div>

        {/* Last Load */}
        {metrics.lastLoadSource && (
          <div className="flex justify-between">
            <span className="text-gray-400">Last Load:</span>
            <span className={metrics.lastLoadSource === 'cache' ? 'text-green-400' : 'text-blue-400'}>
              {metrics.lastLoadSource === 'cache' ? '⚡ Cache' : '🌐 Network'}
            </span>
          </div>
        )}

        {/* Recent Load Times (mini chart) */}
        {metrics.loadTimes.length > 0 && (
          <div className="mt-2">
            <div className="text-gray-500 text-[10px] mb-1">Recent load times:</div>
            <div className="flex items-end gap-px h-8">
              {metrics.loadTimes.slice(-20).map((time, i) => {
                const height = Math.min(100, (time / 500) * 100);
                const color = time < 50 ? 'bg-green-500' : time < 200 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div
                    key={i}
                    className={`w-2 ${color} rounded-t opacity-80`}
                    style={{ height: `${Math.max(10, height)}%` }}
                    title={`${time.toFixed(1)}ms`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between items-center">
        <p className="text-[10px] text-gray-500">Ctrl+Shift+P to toggle</p>
        <button
          onClick={resetPerformanceMetrics}
          className="text-[10px] text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded hover:border-gray-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
}