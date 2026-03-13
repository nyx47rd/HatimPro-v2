import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hatimpro_latest_commit_sha';
const REPO_STORAGE_KEY = 'hatimpro_github_repo';

export function useGitHubUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestCommit, setLatestCommit] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [repo, setRepo] = useState<string>(() => {
    return localStorage.getItem(REPO_STORAGE_KEY) || import.meta.env.VITE_GITHUB_REPO || '';
  });

  const updateRepo = (newRepo: string) => {
    setRepo(newRepo);
    localStorage.setItem(REPO_STORAGE_KEY, newRepo);
    localStorage.removeItem(STORAGE_KEY); // Reset commit tracking for new repo
    setUpdateAvailable(false);
  };

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!repo) {
      if (manual) console.warn("GitHub Repo is not set.");
      return false;
    }

    setIsChecking(true);
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
        return true;
      } else if (!currentSha) {
        // First time running, just save the current commit
        localStorage.setItem(STORAGE_KEY, latestSha);
      }
      
      return false;
    } catch (error) {
      console.error("Error checking for updates:", error);
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
      // Check every hour
      const interval = setInterval(() => {
        checkForUpdates();
      }, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [checkForUpdates, repo]);

  return {
    updateAvailable,
    isChecking,
    lastCheckTime,
    checkForUpdates,
    applyUpdate,
    repo,
    updateRepo
  };
}
