import { useState, useEffect } from 'react';

// Generates a simple UUID-like string if crypto.randomUUID isn't available
function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    let currentId = localStorage.getItem('lamsa_session_id');
    if (!currentId) {
      currentId = generateSessionId();
      localStorage.setItem('lamsa_session_id', currentId);
    }
    setSessionId(currentId);
  }, []);

  return { sessionId, isReady: !!sessionId };
}
