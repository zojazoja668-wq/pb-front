import { useEffect, useRef } from 'react';
import { record } from 'rrweb';
import config from '../config.js';

const API_URL = import.meta.env.VITE_API_URL || config.api.url;

export function useSessionRecording(sessionId) {
  const stopFn = useRef(null);
  const buffer = useRef([]);
  const timer = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const flush = async () => {
      if (buffer.current.length === 0) return;
      const events = buffer.current.splice(0);
      try {
        await fetch(`${API_URL}/api/recording/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });
      } catch (e) {
        // Silent fail
      }
    };

    stopFn.current = record({
      emit(event) {
        buffer.current.push(event);
      },
      maskAllInputs: true,
      blockClass: 'rr-block',
      sampling: {
        mousemove: 50,
        scroll: 150,
        input: 'last'
      }
    });

    timer.current = setInterval(flush, 2000);

    return () => {
      stopFn.current?.();
      clearInterval(timer.current);
      flush();
    };
  }, [sessionId]);
}
