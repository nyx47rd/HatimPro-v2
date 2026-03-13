import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hatimpro_latest_commit_sha';

export function useGitHubUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestCommit, setLatestCommit] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error' | 'no-repo'>('idle');

  const repo = import.meta.env.VITE_GITHUB_REPO;

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!repo) {
      if (manual) console.warn("GitHub Repo is not set.");
      setCheckStatus('no-repo');
      return false;
    }

    setIsChecking(true);
    setCheckStatus('checking');
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/commits/main`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest commit');
      }

      const data = await response.json();
      const latestSha = data.sha;
      const currentSha = localStorage.getItem(STORAGE_KEY);

      setLatestCommit(latestSha);
      setLastCheckTime(new Date());

      if (currentSha && currentSha !== latestSha) {
        setUpdateAvailable(true);
        setCheckStatus('available');
        return true;
      } else if (!currentSha) {
        // First time running, just save the current commit
        localStorage.setItem(STORAGE_KEY, latestSha);
        setCheckStatus('up-to-date');
      } else {
        setCheckStatus('up-to-date');
      }
      
      // Reset status after a few seconds if it was manual and up-to-date
      if (manual) {
        setTimeout(() => {
          setCheckStatus(prev => prev === 'up-to-date' ? 'idle' : prev);
        }, 3000);
      }

      return false;
    } catch (error) {
      console.error("Error checking for updates:", error);
      setCheckStatus('error');
      if (manual) {
        setTimeout(() => setCheckStatus('idle'), 3000);
      }
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [repo]);

  const applyUpdate = () => {
    if (latestCommit) {
      localStorage.setItem(STORAGE_KEY, latestCommit);
    }
    window.location.reload();
  };

  useEffect(() => {
    if (repo) {
      checkForUpdates();
      
      // Check every 5 minutes
      const interval = setInterval(() => {
        checkForUpdates();
      }, 5 * 60 * 1000);

      // Check immediately when the user focuses the window/tab
      const handleFocus = () => checkForUpdates();
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      setCheckStatus('no-repo');
    }
  }, [checkForUpdates, repo]);

  return {
    updateAvailable,
    isChecking,
    lastCheckTime,
    checkStatus,
    checkForUpdates,
    applyUpdate,
    repo
  };
}
