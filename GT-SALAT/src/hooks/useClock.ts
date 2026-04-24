import { useEffect, useState } from 'react';

export function useClock(intervalMs = 1000): Date {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return time;
}
