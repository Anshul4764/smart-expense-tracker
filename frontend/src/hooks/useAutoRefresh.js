
import { useEffect } from "react";

export default function useAutoRefresh(callback, delay = 15000, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    callback();
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay, enabled]);
}
