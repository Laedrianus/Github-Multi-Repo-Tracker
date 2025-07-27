import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { parseISO, startOfWeek, format, isAfter, isBefore } from "date-fns";
// GitHub API Authentication Token (Environment variable)
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
// 1. TECHNICAL TERMS DICTIONARY
const technicalTerms = [
  "github", "commit", "merge", "pull", "push", "repo",
  "npm", "yarn", "node", "js", "ts", "react", "vue",
  "html", "css", "scss", "json", "md", "git", "cli"
];
const getAuthHeaders = () => {
  const headers = {
    Accept: "application/vnd.github.v3+json"
  };
  // Only add Authorization header if token exists
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }
  return headers;
};
// Commit Types
const COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "chore",
  "other"
];
// File Categories and Extensions
const CATEGORY_RULES = {
  backend: [".js", ".ts", ".py", ".go", ".java", ".rb", ".php", ".cs", ".rs"],
  frontend: [".jsx", ".tsx", ".vue", ".css", ".scss", ".html", ".svelte"],
  docs: [".md", ".txt", ".rst"],
  config: [".json", ".yml", ".yaml", ".toml", ".ini", ".env"],
};
// --- NEW: Date Range Changes Summary Component ---
// New component that summarizes commits for the selected date range
// No longer dependent on contributor selection
function DateRangeSummary({ commits, darkMode, theme }) {
  const [summary, setSummary] = useState({});
  useEffect(() => {
    const processCommits = () => {
      const summaryData = {};
      commits.forEach(commit => {
        // Commit object from GitHub API, detailed info might come from /repos/{owner}/{repo}/commits/{ref} endpoint (for files info).
        // However, commits directly from /repos/{owner}/{repo}/commits might not have files info.
        // So process files if available, otherwise skip.
        if (!commit.files) return; 
        commit.files.forEach(file => {
          const pathParts = file.filename.split('/');
          // Top-level directory or file name
          const topLevel = pathParts[0] || 'root';
          if (!summaryData[topLevel]) {
            summaryData[topLevel] = {
              name: topLevel,
              commitCount: 0,
              newFiles: 0,
              modifiedFiles: 0,
              deletedFiles: 0,
              // We can use a Set to track commits, but a simple counter is sufficient here
              commits: new Set() 
            };
          }
          summaryData[topLevel].commits.add(commit.sha); // Prevent counting the same commit multiple times
          if (file.status === 'added') {
            summaryData[topLevel].newFiles += 1;
          } else if (file.status === 'modified') {
            summaryData[topLevel].modifiedFiles += 1;
          } else if (file.status === 'removed') {
            summaryData[topLevel].deletedFiles += 1;
          }
        });
      });
      // Convert Set to count
      Object.values(summaryData).forEach(item => {
        item.commitCount = item.commits.size;
        delete item.commits; // No longer needed
      });
      setSummary(summaryData);
    };
    if (commits && commits.length > 0) {
      processCommits();
    } else {
      setSummary({});
    }
  }, [commits]);
  const bgColor = darkMode ? "rgba(30, 30, 40, 0.5)" : "rgba(245, 245, 250, 0.8)";
  const borderColor = darkMode ? "#444" : "#ddd";
  const iconColor = darkMode ? "#90caf9" : "#1976d2";
  if (Object.keys(summary).length === 0) {
    return (
      <div style={{ 
        background: bgColor, 
        padding: '15px', 
        borderRadius: '12px', 
        border: `1px solid ${borderColor}`,
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: 0, color: darkMode ? "#ddd" : "#444" }}>No changes found for the selected date range.</h4>
      </div>
    );
  }
  return (
    <div style={{ 
      background: bgColor, 
      padding: '15px', 
      borderRadius: '12px', 
      border: `1px solid ${borderColor}`,
      marginBottom: '20px'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: darkMode ? "#ddd" : "#444" }}>
        Changes Summary for Selected Date Range (All Contributors)
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        {Object.values(summary).map(item => (
          <div 
            key={item.name} 
            style={{ 
              flex: '1 0 200px', 
              padding: '12px', 
              background: darkMode ? "rgba(50, 50, 60, 0.3)" : "rgba(255, 255, 255, 0.5)", 
              borderRadius: '8px', 
              border: `1px solid ${borderColor}` 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ 
                marginRight: '8px', 
                fontSize: '16px',
                // Simple icon assignment
                color: iconColor
              }}>
                {item.name.endsWith('.sol') ? '🛠️' : 
                 item.name.endsWith('.js') || item.name.endsWith('.ts') || item.name.endsWith('.jsx') || item.name.endsWith('.tsx') ? '🧪' : 
                 item.name.endsWith('.md') || item.name === 'docs' ? '📚' : 
                 item.name === 'frontend' ? '📝' : '📁'}
              </span>
              <strong style={{ color: darkMode ? "#bbb" : "#333" }}>{item.name}</strong>
            </div>
            <div style={{ fontSize: '13px', color: darkMode ? "#aaa" : "#666" }}>
              <div>{item.commitCount} {item.commitCount === 1 ? 'commit' : 'commits'}</div>
              {item.newFiles > 0 && <div>+ {item.newFiles} new file{item.newFiles > 1 ? 's' : ''}</div>}
              {item.modifiedFiles > 0 && <div>~ {item.modifiedFiles} file{item.modifiedFiles > 1 ? 's' : ''} modified</div>}
              {item.deletedFiles > 0 && <div>- {item.deletedFiles} file{item.deletedFiles > 1 ? 's' : ''} deleted</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// --- NEW END: Date Range Changes Summary Component ---
// --- NEW: Recent Commits Modal Component ---
// RecentCommitsModal with spell check functionality added
function RecentCommitsModal({ onClose, darkMode, recentCommits, onRepoSelect, onSpellCheck }) {
  const themeBg = darkMode ? "rgba(30, 30, 40, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const themeColor = darkMode ? "#eee" : "#222";
  const borderColor = darkMode ? "#444" : "#ddd";
  const buttonBg = darkMode ? "#3949ab" : "#1976d2";
  const buttonHoverBg = darkMode ? "#303f9f" : "#1565c0";
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100000 // Higher than InfoModal
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeBg,
          color: themeColor,
          maxWidth: 700,
          width: "95%",
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 30,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          border: darkMode ? "1px solid #333" : "1px solid #e0e0e0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            float: "right",
            background: "transparent",
            border: "none",
            fontSize: 28,
            color: themeColor,
            opacity: 0.7,
            transition: "opacity 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.opacity = 1)}
          onMouseOut={(e) => (e.target.style.opacity = 0.7)}
        >
          &times;
        </button>
        <h2 style={{ marginBottom: 20, color: darkMode ? "#64b5f6" : "#1976d2" }}>
          Recent Commits
        </h2>
        <p style={{ marginBottom: 20 }}>Last 25 commits across all repositories</p>
        {recentCommits.length === 0 ? (
          <p>No recent commits found.</p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {recentCommits.map((commit, index) => (
              <li
                key={`${commit.sha}-${index}`}
                style={{
                  marginBottom: 15,
                  paddingBottom: 15,
                  borderBottom: `1px solid ${borderColor}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div>
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        textDecoration: "none",
                        color: darkMode ? "#64b5f6" : "#1976d2",
                        fontWeight: 'bold',
                        fontSize: '14px',
                        display: 'block',
                        marginBottom: '5px'
                      }}
                    >
                      {commit.commit.message.split('\n')[0]} {/* FIXED: split('\n') */}
                    </a>
                    <button
                      onClick={() => onSpellCheck(commit.commit.message)} // Spell check call
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        background: buttonBg,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => (e.target.style.background = buttonHoverBg)}
                      onMouseOut={(e) => (e.target.style.background = buttonBg)}
                    >
                      🔍 Spell Check
                    </button>
                  </div>
                  <span
                    onClick={() => onRepoSelect(commit.repository.full_name)}
                    style={{
                      cursor: 'pointer',
                      color: darkMode ? "#90caf9" : "#1976d2",
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {commit.repository.full_name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: darkMode ? "#bbb" : "#666" }}>
                  <span>
                    <strong>{commit.commit.author.name}</strong>
                  </span>
                  <span>{new Date(commit.commit.author.date).toLocaleString('en-US')}</span> {/* FIXED: 'en-US' added */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
// --- NEW END: Recent Commits Modal Component ---
// --- NEW: Spell Check Modal Component ---
// SpellCheckModal's z-index increased
function SpellCheckModal({ message, onClose, darkMode, spellCheckResult, isChecking }) {
  const themeBg = darkMode ? "rgba(30, 30, 40, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const themeColor = darkMode ? "#eee" : "#222";
  const borderColor = darkMode ? "#444" : "#ddd";
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        // Z-index fixed: Higher than RecentCommitsModal (100000)
        zIndex: 100001 
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeBg,
          color: themeColor,
          maxWidth: 700,
          width: "95%",
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 30,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          border: darkMode ? "1px solid #333" : "1px solid #e0e0e0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            float: "right",
            background: "transparent",
            border: "none",
            fontSize: 28,
            color: themeColor,
            opacity: 0.7,
            transition: "opacity 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.opacity = 1)}
          onMouseOut={(e) => (e.target.style.opacity = 0.7)}
        >
          &times;
        </button>
        <h2 style={{ marginBottom: 20, color: darkMode ? "#64b5f6" : "#1976d2" }}>
          Spell Check for Commit Message
        </h2>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: darkMode ? "#90caf9" : "#1976d2" }}>Original Message:</h3>
          <p style={{ whiteSpace: 'pre-wrap', padding: '10px', border: `1px solid ${borderColor}`, borderRadius: '8px', backgroundColor: darkMode ? 'rgba(50,50,60,0.5)' : 'rgba(240,240,250,0.5)' }}>
            {message}
          </p>
        </div>
        <div>
          <h3 style={{ color: darkMode ? "#90caf9" : "#1976d2" }}>Spell Check Result:</h3>
          {isChecking ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>🔍 Checking spelling...</p>
          ) : spellCheckResult ? (
            <div>
              <div style={{ marginBottom: 15 }}>
                <strong>Language:</strong> {spellCheckResult.language?.name} ({spellCheckResult.language?.code})
              </div>
              {spellCheckResult.matches && spellCheckResult.matches.length > 0 ? (
                <div>
                  <p><strong>Potential Issues Found:</strong></p>
                  <ul style={{ paddingLeft: '20px' }}>
                    {spellCheckResult.matches.map((match, index) => (
                      <li key={index} style={{ marginBottom: '15px' }}>
                        <strong>Word:</strong> "{match.word}" (at position {match.offset})
                        <br />
                        <strong>Suggestions:</strong> {match.replacements && match.replacements.length > 0 ? match.replacements.map(r => r.value).join(', ') : 'None provided'}
                        <br />
                        <small><em>Context:</em> ...{message.substring(Math.max(0, match.offset - 10), match.offset + match.length + 10)}...</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: darkMode ? '#a5d6a7' : '#388e3c' }}>✅ No spelling issues detected.</p>
              )}
            </div>
          ) : (
            <p>❌ Failed to perform spell check. Please try again later.</p>
          )}
        </div>
      </div>
    </div>
  );
}
// --- NEW END: Spell Check Modal Component ---
function getCommitType(message) {
  if (!message) return "other";
  const lower = message.toLowerCase();
  for (const type of COMMIT_TYPES) {
    if (lower.startsWith(type + ":")) return type;
  }
  return "other";
}
function groupCommitsByWeek(commits) {
  const weeks = {};
  commits.forEach(({ commit }) => {
    const date = parseISO(commit.author.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    weeks[key] = (weeks[key] || 0) + 1;
  });
  return Object.entries(weeks)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));
}
function isInDateRange(dateStr, from, to) {
  if (!from && !to) return true;
  const d = new Date(dateStr);
  if (from && isBefore(d, new Date(from))) return false;
  if (to && isAfter(d, new Date(to))) return false;
  return true;
}
function categorizeFile(path) {
  const extMatch = path.match(/\.[^/.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '';
  for (const [category, extensions] of Object.entries(CATEGORY_RULES)) {
    if (extensions.includes(ext)) return category;
  }
  return 'other';
}
// --- CHANGED: CommitDetails Component ---
// CommitDetails component with spell check button and functionality added
function CommitDetails({ username, commits, darkMode, onSpellCheck }) {
  if (!commits || commits.length === 0)
    return <p>No commits to show for {username}.</p>;
  const bgColor = darkMode ? "rgba(30, 30, 40, 0.5)" : "rgba(245, 245, 250, 0.8)";
  const borderColor = darkMode ? "#444" : "#ddd";
  return (
    <div
      style={{
        maxHeight: 200,
        overflowY: "auto",
        border: `1px solid ${borderColor}`,
        padding: 15,
        marginTop: 15,
        borderRadius: 12,
        backgroundColor: bgColor,
        backdropFilter: "blur(4px)",
        boxShadow: darkMode
          ? "0 4px 20px rgba(0,0,0,0.3)"
          : "0 4px 20px rgba(0,0,0,0.05)"
      }}
    >
      <h4
        style={{
          color: darkMode ? "#ddd" : "#444",
          marginBottom: 10
        }}
      >
        Commit Details for {username}
      </h4>
      <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
        {/* New component used for commit rows */}
        {commits.map((c) => (
          <CommitDetailItem
            key={c.sha}
            commit={c}
            darkMode={darkMode}
            borderColor={borderColor}
            onSpellCheck={onSpellCheck}
          />
        ))}
      </ul>
    </div>
  );
}
// --- CHANGED END: CommitDetails Component ---
// --- NEW: CommitDetailItem Component ---
// New component that shows each commit row and the spell check button
function CommitDetailItem({ commit, darkMode, borderColor, onSpellCheck }) {
  const handleSpellCheckClick = () => {
    onSpellCheck(commit.commit.message);
  };
  return (
    <li
      style={{
        marginBottom: 10,
        paddingBottom: 10,
        borderBottom: `1px solid ${borderColor}`
      }}
    >
      <strong
        style={{
          display: "block",
          color: darkMode ? "#bbb" : "#666",
          fontSize: 12
        }}
      >
        {new Date(commit.commit.author.date).toLocaleDateString('en-US')} {/* FIXED: 'en-US' added */}
      </strong>
      <div style={{ position: 'relative' }}>
        <a
          href={commit.html_url}
          target="_blank"
          rel="noreferrer"
          style={{
            textDecoration: "none",
            color: darkMode ? "#64b5f6" : "#1976d2",
            display: "block",
            lineHeight: 1.4,
            marginBottom: '5px' // Space between button and message
          }}
        >
          {commit.commit.message}
        </a>
        <button
          onClick={handleSpellCheckClick}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            background: darkMode ? '#3949ab' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 Spell Check
        </button>
      </div>
    </li>
  );
}
// --- NEW END: CommitDetailItem Component ---
function InfoModal({ onClose, darkMode }) {
  const themeBg = darkMode ? "rgba(30, 30, 40, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const themeColor = darkMode ? "#eee" : "#222";
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeBg,
          color: themeColor,
          padding: 30,
          borderRadius: 16,
          maxWidth: 800,
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          border: darkMode ? "1px solid #333" : "1px solid #e0e0e0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            float: "right",
            background: "transparent",
            border: "none",
            fontSize: 24,
            color: themeColor,
            opacity: 0.7,
            transition: "opacity 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.opacity = 1)}
          onMouseOut={(e) => (e.target.style.opacity = 0.7)}
        >
          &times;
        </button>
        <h2
          style={{
            textAlign: "center",
            marginBottom: 30,
            color: darkMode ? "#fff" : "#2c3e50"
          }}
        >
          GitHub Multi Repo Contributor Tracker
        </h2>
        <p
          style={{
            textAlign: "center",
            marginBottom: 30,
            fontSize: 18,
            lineHeight: 1.6
          }}
        >
          This React application is a powerful tool designed to analyze contributors and commit statistics across GitHub repositories.
        </p>
        <h3
          style={{
            borderBottom: darkMode ? "1px solid #444" : "1px solid #eee",
            paddingBottom: 10,
            color: darkMode ? "#64b5f6" : "#1976d2"
          }}
        >
          Application Features
        </h3>
        <div
          style={{
            marginTop: 20
          }}
        >
          <ol style={{ paddingLeft: 20 }}>
            <li><strong>Multi-Repository Tracking:</strong> Users can add repositories in owner/repo format, search and select from a list, and remove or switch between them.</li>
            <li><strong>Contributor Analysis:</strong> Lists contributors for a selected repository, showing individual commit counts, with options to select and favorite contributors.</li>
            <li><strong>Commit Statistics:</strong> Filters commits by date range and type (feat, fix, docs, etc.). Includes a weekly commit comparison chart.</li>
            <li><strong>File Structure Analysis:</strong> Categorizes project files (e.g., frontend, backend, docs, config) and displays file counts per category.</li>
            <li><strong>Categorical Commit Analysis:</strong> Analyzes which contributors commit to which categories and visualizes the distribution.</li>
            <li><strong>Date Range Summary:</strong> Summarizes changes in the selected time window, including new, modified, and deleted files.</li>
            <li><strong>Latest Commits Modal:</strong> Displays the most recent 25 commits across all repositories. Includes optional spell-checking for commit messages.</li>
            <li><strong>Spell Check for Commits:</strong> Detects typos in commit messages and suggests corrections.</li>
            <li><strong>Theme Support:</strong> Supports both light and dark themes.</li>
            <li><strong>Modals and Info Panels:</strong> Repository addition modal, spell-check modal, and an info panel with app details.</li>
            <li><strong>Responsive Design:</strong> Adapts seamlessly across different screen sizes.</li>
            <li><strong>Error Handling:</strong> Informs users about API errors and loading states.</li>
            <li><strong>Local Storage:</strong> Stores favorites persistently in local storage.</li>
            <li><strong>API Authentication:</strong> Supports GitHub API authentication via personal access tokens.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
function OwnerRepoModal({ owner, onClose, darkMode, onSelectRepos }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const themeBg = darkMode
    ? "rgba(30, 30, 40, 0.95)"
    : "rgba(255, 255, 255, 0.95)";
  const themeColor = darkMode ? "#eee" : "#222";
  const borderColor = darkMode ? "#444" : "#ddd";
  const buttonBg = darkMode ? "#3949ab" : "#1976d2";
  const buttonHoverBg = darkMode ? "#303f9f" : "#1565c0";
  useEffect(() => {
    if (!owner) return;
    setLoading(true);
    setError(null);
    setRepos([]);
    setSelectedRepos([]);
    const userUrl = `https://api.github.com/users/${owner}/repos?per_page=100`;
    const orgUrl = `https://api.github.com/orgs/${owner}/repos?per_page=100`;
    fetch(userUrl, { headers: getAuthHeaders() })
      .then(async (res) => {
        if (res.ok) {
          return await res.json();
        } else if (res.status === 404) {
          const orgResponse = await fetch(orgUrl, { headers: getAuthHeaders() });
          if (orgResponse.ok) {
            return await orgResponse.json();
          }
          throw new Error("Not found as user or organization");
        } else {
          throw new Error(`GitHub API error: ${res.status}`);
        }
      })
      .then((data) => {
        setRepos(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.message.includes("Not found")
            ? "Owner not found as user or organization"
            : "Failed to load repos for owner"
        );
        setLoading(false);
      });
  }, [owner]);
  const toggleSelectRepo = (fullName) =>
    setSelectedRepos((prev) =>
      prev.includes(fullName)
        ? prev.filter((r) => r !== fullName)
        : [...prev, fullName]
    );
  const copySelected = () =>
    navigator.clipboard.writeText(selectedRepos.join('\n')); // FIXED: '\n' corrected
  const addAll = () => {
    onSelectRepos(repos.map((r) => r.full_name));
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeBg,
          color: themeColor,
          maxWidth: 700,
          width: "95%",
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 30,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          border: darkMode ? "1px solid #333" : "1px solid #e0e0e0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            float: "right",
            background: "transparent",
            border: "none",
            fontSize: 28,
            color: themeColor,
            opacity: 0.7,
            transition: "opacity 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.opacity = 1)}
          onMouseOut={(e) => (e.target.style.opacity = 0.7)}
        >
          &times;
        </button>
        <h2
          style={{
            marginBottom: 20,
            color: darkMode ? "#64b5f6" : "#1976d2"
          }}
        >
          {owner}'s Repositories
        </h2>
        {loading && (
          <p style={{ textAlign: "center", padding: 20 }}>
            🔍 Loading repositories...
          </p>
        )}
        {error && (
          <p
            style={{
              color: "#e53935",
              padding: 10,
              backgroundColor: darkMode ? "#2e1e1e" : "#ffebee",
              borderRadius: 8
            }}
          >
            ⚠️ {error}
          </p>
        )}
        {!loading && !error && (
          <>
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                border: `1px solid ${borderColor}`,
                padding: 20,
                marginBottom: 20,
                backgroundColor: darkMode
                  ? "rgba(40,40,50,0.3)"
                  : "rgba(245,245,255,0.5)",
                borderRadius: 12,
                backdropFilter: "blur(4px)"
              }}
            >
              {repos.length === 0 && (
                <p style={{ textAlign: "center", color: themeColor }}>
                  No repositories found
                </p>
              )}
              {repos.map((repo) => (
                <label
                  key={repo.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    marginBottom: 12
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRepos.includes(repo.full_name)}
                    onChange={() => toggleSelectRepo(repo.full_name)}
                    style={{
                      marginRight: 12,
                      width: 18,
                      height: 18,
                      accentColor: darkMode ? "#3949ab" : "#1976d2"
                    }}
                  />
                  <span style={{ color: themeColor }}>
                    {repo.full_name}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
              <button
                onClick={copySelected}
                disabled={!selectedRepos.length}
                style={{
                  padding: "10px 18px",
                  background: buttonBg,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: selectedRepos.length ? "pointer" : "not-allowed",
                  opacity: selectedRepos.length ? 1 : 0.6,
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) =>
                  selectedRepos.length &&
                  (e.target.style.background = buttonHoverBg)
                }
                onMouseOut={(e) => (e.target.style.background = buttonBg)}
              >
                📋 Copy Selected
              </button>
              <button
                onClick={addAll}
                disabled={!repos.length}
                style={{
                  padding: "10px 18px",
                  background: buttonBg,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: repos.length ? "pointer" : "not-allowed",
                  opacity: repos.length ? 1 : 0.6,
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) =>
                  repos.length &&
                  (e.target.style.background = buttonHoverBg)
                }
                onMouseOut={(e) => (e.target.style.background = buttonBg)}
              >
                ➕ Add All
              </button>
              <button
                onClick={() => onSelectRepos(selectedRepos)}
                disabled={!selectedRepos.length}
                style={{
                  padding: "10px 18px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: selectedRepos.length ? "pointer" : "not-allowed",
                  opacity: selectedRepos.length ? 1 : 0.6,
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) =>
                  selectedRepos.length && (e.target.style.background = "#388e3c")
                }
                onMouseOut={(e) => (e.target.style.background = "#4caf50")}
              >
                ✔️ Add Selected
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- NEW: Rate Limit Component ---
function RateLimitInfo({ darkMode, theme }) {
  const [rateLimit, setRateLimit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRateLimit = useCallback(async () => {
    if (!GITHUB_TOKEN) {
      setRateLimit(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rate limit: ${response.status}`);
      }
      
      const data = await response.json();
      setRateLimit(data.resources.core);
    } catch (err) {
      console.error("Error fetching rate limit:", err);
      setError("Failed to fetch rate limit information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRateLimit();
    // Update rate limit info every 30 seconds
    const interval = setInterval(fetchRateLimit, 30000);
    return () => clearInterval(interval);
  }, [fetchRateLimit]);

  if (!GITHUB_TOKEN) {
    return (
      <div style={{ 
        background: darkMode ? "rgba(255, 152, 0, 0.1)" : "rgba(255, 152, 0, 0.2)", 
        padding: '10px 15px', 
        borderRadius: '8px', 
        border: `1px solid ${darkMode ? "#ff9800" : "#f57c00"}`,
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <span style={{ color: darkMode ? "#ffcc80" : "#e65100" }}>
          ⚠️ No GitHub token provided. Using anonymous access (60 requests/hour). 
          Set <code>REACT_APP_GITHUB_TOKEN</code> in your environment variables to increase limit to 5000/hour.
        </span>
      </div>
    );
  }

  if (loading && !rateLimit) {
    return (
      <div style={{ 
        background: theme.cardBg, 
        padding: '10px 15px', 
        borderRadius: '8px', 
        border: `1px solid ${theme.borderColor}`,
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <span>Loading rate limit info...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: darkMode ? "rgba(244, 67, 54, 0.1)" : "rgba(244, 67, 54, 0.2)", 
        padding: '10px 15px', 
        borderRadius: '8px', 
        border: `1px solid ${darkMode ? "#f44336" : "#d32f2f"}`,
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <span style={{ color: darkMode ? "#ffcdd2" : "#b71c1c" }}>
          ⚠️ {error}
        </span>
      </div>
    );
  }

  if (!rateLimit) return null;

  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 5;

  return (
    <div style={{ 
      background: theme.cardBg, 
      padding: '15px', 
      borderRadius: '8px', 
      border: `1px solid ${theme.borderColor}`,
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, color: darkMode ? "#ddd" : "#444", fontSize: '16px' }}>
          GitHub API Rate Limit
        </h4>
        <button 
          onClick={fetchRateLimit}
          style={{
            background: 'transparent',
            border: 'none',
            color: darkMode ? "#64b5f6" : "#1976d2",
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
          onMouseOver={(e) => e.target.style.background = darkMode ? "rgba(100, 181, 246, 0.1)" : "rgba(25, 118, 210, 0.1)"}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          🔄 Refresh
        </button>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
          <span>Requests:</span>
          <span>
            <strong>{rateLimit.remaining}</strong> / {rateLimit.limit}
          </span>
        </div>
        <div style={{ 
          height: '8px', 
          backgroundColor: darkMode ? "#444" : "#e0e0e0", 
          borderRadius: '4px', 
          overflow: 'hidden' 
        }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${percentage}%`,
              backgroundColor: isCritical ? '#f44336' : isLow ? '#ff9800' : (darkMode ? '#64b5f6' : '#1976d2'),
              transition: 'width 0.3s ease'
            }} 
          />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: darkMode ? "#aaa" : "#666" }}>
        Resets at: {new Date(rateLimit.reset * 1000).toLocaleTimeString('en-US')} {/* FIXED: 'en-US' added */}
      </div>
    </div>
  );
}
// --- NEW END: Rate Limit Component ---

function App() {
  const [repos, setRepos] = useState([]);
  const [newRepo, setNewRepo] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [selectedRepoIsLoading, setSelectedRepoIsLoading] = useState(false);
  const [repoErrors, setRepoErrors] = useState({});
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userCommitsMap, setUserCommitsMap] = useState({});
  const [userCategoryCommitsMap, setUserCategoryCommitsMap] = useState({});
  const [userCategoryDetails, setUserCategoryDetails] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});
  const [commitFilter, setCommitFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [favorites, setFavorites] = useState(() =>
    JSON.parse(localStorage.getItem("favorites") || "[]")
  );
  const [darkMode, setDarkMode] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerForModal, setOwnerForModal] = useState(null);
  const [repoFileTreeMap, setRepoFileTreeMap] = useState({});
  const [repoFileMap, setRepoFileMap] = useState({});
  // --- NEW: Spell Check States ---
  const [showSpellCheckModal, setShowSpellCheckModal] = useState(false);
  const [currentSpellCheckMessage, setCurrentSpellCheckMessage] = useState("");
  const [spellCheckResult, setSpellCheckResult] = useState(null);
  const [isSpellCheckLoading, setIsSpellCheckLoading] = useState(false);
  // --- NEW END: Spell Check States --
  // --- NEW: Recent Commits States ---
  const [showRecentCommitsModal, setShowRecentCommitsModal] = useState(false);
  const [recentCommits, setRecentCommits] = useState([]);
  const [recentCommitsLoading, setRecentCommitsLoading] = useState(false);
  // --- NEW END: Recent Commits States ---
  // --- NEW: All Filtered Commits State ---
  const [allFilteredCommits, setAllFilteredCommits] = useState([]);
  const [isFetchingAllCommits, setIsFetchingAllCommits] = useState(false);
  // --- NEW END: All Filtered Commits State ---
  const lightTheme = {
    backgroundColor: "#f8f9fa",
    color: "#333",
    cardBg: "rgba(255, 255, 255, 0.8)",
    cardShadow: "0 5px 20px rgba(0,0,0,0.05), 0 2px 10px rgba(0,0,0,0.02)",
    buttonBg: "#1976d2",
    buttonHoverBg: "#1565c0",
    buttonColor: "#fff",
    borderColor: "#e0e0e0",
    inputBg: "rgba(255, 255, 255, 0.9)",
    headerBg: "linear-gradient(135deg, #1976d2 0%, #004ba0 100%)"
  };
  const darkTheme = {
    backgroundColor: "#121212",
    color: "#e0e0e0",
    cardBg: "rgba(30, 30, 40, 0.5)",
    cardShadow: "0 5px 25px rgba(0,0,0,0.3), 0 2px 15px rgba(0,0,0,0.2)",
    buttonBg: "#3949ab",
    buttonHoverBg: "#303f9f",
    buttonColor: "#e0e0e0",
    borderColor: "#333",
    inputBg: "rgba(40, 40, 50, 0.5)",
    headerBg: "linear-gradient(135deg, #1a237e 0%, #000051 100%)"
  };
  const theme = darkMode ? darkTheme : lightTheme;
  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? "#121212" : "#f8f9fa";
    document.body.style.color = darkMode ? "#eee" : "#333";
  }, [darkMode]);
  // --- NEW: Spell Check Function ---
  // Language parameter fixed to 'en-US'
  const performSpellCheck = useCallback(async (message) => {
    if (!message) return;
    setCurrentSpellCheckMessage(message);
    setShowSpellCheckModal(true);
    setIsSpellCheckLoading(true);
    setSpellCheckResult(null);
    try {
      // POST request to LanguageTool API
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: message,
          language: 'en-US' // English only
        })
      });
      if (!response.ok) {
        throw new Error(`Spell check API error: ${response.status}`);
      }
      const data = await response.json();
      setSpellCheckResult(data);
    } catch (err) {
      console.error("Spell check failed:", err);
      setSpellCheckResult({ error: err.message });
    } finally {
      setIsSpellCheckLoading(false);
    }
  }, []);
  // --- NEW END: Spell Check Function ---
  // --- NEW: Fetch Recent Commits Function ---
  const fetchRecentCommits = async () => {
    if (repos.length === 0) return;
    setRecentCommitsLoading(true);
    setError(null);
    try {
      // Fetch recent commits for all repositories in parallel
      const promises = repos.map(repo =>
        fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, { 
          headers: getAuthHeaders() 
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch commits for ${repo}`);
          return res.json();
        }).then(commits => 
          commits.map(commit => ({
            ...commit,
            repository: { full_name: repo }
          }))
        )
      );
      const results = await Promise.all(promises);
      // Put all commits into a single array and sort by date
      const allCommits = results.flat();
      allCommits.sort((a, b) => 
        new Date(b.commit.author.date) - new Date(a.commit.author.date)
      );
      // Take the first 25 commits
      setRecentCommits(allCommits.slice(0, 25));
      setShowRecentCommitsModal(true);
    } catch (err) {
      console.error("Error fetching recent commits:", err);
      setError("Failed to load recent commits.");
    } finally {
      setRecentCommitsLoading(false);
    }
  };
  // --- NEW END: Fetch Recent Commits Function ---
  const clearRepoData = (repo) => {
    setContributors([]);
    setSelectedUsers([]);
    setUserCommitsMap({});
    setUserCategoryCommitsMap({});
    setUserCategoryDetails({});
    setRepoFileMap({});
    setRepoFileTreeMap({});
    setRepoErrors({});
    setAllFilteredCommits([]); // Clear this list when repo changes
  };
  const addRepo = (repoFullName) => {
    if (!repoFullName || repos.includes(repoFullName)) {
      setError("Repo already added");
      return;
    }
    setError(null);
    const updated = [...repos, repoFullName].sort((a, b) =>
      a.localeCompare(b)
    );
    setRepos(updated);
    setSelectedRepo(repoFullName);
    setNewRepo("");
    clearRepoData(repoFullName);
  };
  const addRepos = (repoList) => {
    const filtered = repoList.filter((r) => r && !repos.includes(r));
    setRepos((prev) => [...prev, ...filtered].sort((a, b) => a.localeCompare(b)));
    setError(null);
    if (filtered.length > 0) {
      setSelectedRepo(filtered[0]);
      clearRepoData(filtered[0]);
    }
  };
  const removeRepo = (repoName) => {
    setRepos((prev) => prev.filter((r) => r !== repoName));
    if (selectedRepo === repoName) {
      setSelectedRepo(null);
      setContributors([]);
      setSelectedUsers([]);
      setUserCommitsMap({});
      setUserCategoryCommitsMap({});
      setUserCategoryDetails({});
      setRepoFileMap({});
      setRepoFileTreeMap({});
      setAllFilteredCommits([]); // Clear this list when repo is removed
    }
  };
  const fetchRepoFileTree = async (repoName) => {
    setSelectedRepoIsLoading(true);
    try {
      const repoExists = Object.keys(repoFileTreeMap).includes(repoName);
      if (repoExists) {
        setSelectedRepoIsLoading(false);
        return;
      }
      const repoDetailsRes = await fetch(
        `https://api.github.com/repos/${repoName}`,
        { headers: getAuthHeaders() }
      );
      if (!repoDetailsRes.ok) return;
      const repoDetails = await repoDetailsRes.json();
      const res = await fetch(
        `https://api.github.com/repos/${repoName}/git/trees/${repoDetails.default_branch}?recursive=1`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        setRepoErrors((prev) => ({ ...prev, [repoName]: "Error fetching file structure" }));
        setSelectedRepoIsLoading(false);
        return;
      }
      const data = await res.json();
      if (!data || !data.tree) {
        setRepoErrors((prev) => ({ ...prev, [repoName]: "Empty or invalid tree structure" }));
        setSelectedRepoIsLoading(false);
        return;
      }
      const files = data.tree.filter((item) => item.type === "blob");
      const categorizedFiles = {};
      const fileMap = {};
      files.forEach((file) => {
        const category = categorizeFile(file.path);
        if (!categorizedFiles[category]) {
          categorizedFiles[category] = [];
        }
        categorizedFiles[category].push(file);
        fileMap[file.path] = category;
      });
      setRepoFileTreeMap((prev) => ({
        ...prev,
        [repoName]: categorizedFiles
      }));
      setRepoFileMap((prev) => ({
        ...prev,
        [repoName]: fileMap
      }));
      setSelectedRepoIsLoading(false);
    } catch (error) {
      setRepoErrors((prev) => ({ ...prev, [repoName]: "Error loading file structure" }));
      setSelectedRepoIsLoading(false);
    }
  };
  const fetchRepoCommitCategories = async (repoName, username) => {
    if (!username || !repoName || !repoFileMap[repoName]) return;
    setLoadingUsers((prev) => ({ ...prev, [username]: true }));
    setError(null);
    try {
      let page = 1;
      let allDetails = [];
      const totalCategorizedCommits = {
        backend: 0,
        frontend: 0,
        docs: 0,
        config: 0,
        other: 0,
      };
      while (true) {
        const res = await fetch(
          `https://api.github.com/repos/${repoName}/commits?author=${username}&per_page=100&page=${page}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Rate limit exceeded");
          }
          break;
        }
        const data = await res.json();
        if (data.length === 0) break;
        // Fetch commit details to get 'files'
        const detailedCommits = await Promise.all(
          data.map(async (commit) => {
            const detailRes = await fetch(commit.url, { headers: getAuthHeaders() });
            if (!detailRes.ok) return null;
            return await detailRes.json();
          })
        );
        // Filter out any failed fetches
        const validCommits = detailedCommits.filter(c => c !== null);
        allDetails = allDetails.concat(validCommits);
        // Process file categories
        validCommits.forEach((commit) => {
          if (!commit.files || !commit.files.length) return;
          commit.files.forEach((file) => {
            const category = repoFileMap[repoName][file.filename] || "other";
            totalCategorizedCommits[category] =
              (totalCategorizedCommits[category] || 0) + 1;
          });
        });
        if (data.length < 100) break; // No more pages
        page++;
      }
      setUserCategoryCommitsMap((prev) => ({
        ...prev,
        [repoName]: {
          ...(prev[repoName] || {}),
          [username]: totalCategorizedCommits
        }
      }));
      setUserCategoryDetails((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] || {}),
          [repoName]: allDetails
        }
      }));
    } catch (error) {
      setError(error.message || "Error loading commit data for user");
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [username]: false }));
    }
  };
  const fetchContributors = async (repo) => {
    setError(null);
    setSelectedUsers([]);
    setUserCommitsMap({});
    setUserCategoryCommitsMap({});
    setUserCategoryDetails({});
    setContributors([]);
    try {
      const contributorsUrl = `https://api.github.com/repos/${repo}/contributors`;
      const res = await fetch(contributorsUrl, { headers: getAuthHeaders() });
      if (!res.ok) {
        setError("Error fetching contributors.");
        return;
      }
      const contributorsData = await res.json();
      setContributors(contributorsData);
      await fetchRepoFileTree(repo);
    } catch (error) {
      setError("Error fetching contributors or file structure.");
    }
  };
  const fetchUserCommits = async (username) => {
    setLoadingUsers((prev) => ({ ...prev, [username]: true }));
    setError(null);
    let allCommits = [];
    let page = 1;
    const per_page = 100;
    try {
      while (true) {
        const res = await fetch(
          `https://api.github.com/repos/${selectedRepo}/commits?author=${username}&per_page=${per_page}&page=${page}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Rate limit exceeded");
          }
          break;
        }
        const data = await res.json();
        if (data.length === 0) break;
        // Fetch commit details to get 'files'
        const detailedCommits = await Promise.all(
          data.map(async (commit) => {
            const detailRes = await fetch(commit.url, { headers: getAuthHeaders() });
            if (!detailRes.ok) return null;
            return await detailRes.json();
          })
        );
        // Filter out any failed fetches
        const validCommits = detailedCommits.filter(c => c !== null);
        allCommits = allCommits.concat(validCommits);
        page++;
      }
      setUserCommitsMap((prev) => ({ ...prev, [username]: allCommits }));
    } catch (error) {
      setError(error.message || "Error fetching user commits.");
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [username]: false }));
    }
  };
  useEffect(() => {
    if (selectedRepo) {
      fetchContributors(selectedRepo);
    }
  }, [selectedRepo]);
  const toggleUserSelection = (username) => {
    setSelectedUsers((prev) => {
      if (prev.includes(username)) return prev.filter((u) => u !== username);
      if (!userCommitsMap[username]) fetchUserCommits(username);
      return [...prev, username];
    });
  };
  useEffect(() => {
    if (selectedRepo && repoFileMap[selectedRepo]) {
      selectedUsers.forEach((user) => {
        if (
          !userCategoryCommitsMap[selectedRepo]?.[user] &&
          !loadingUsers[user]
        ) {
          fetchRepoCommitCategories(selectedRepo, user);
        }
      });
    }
  }, [selectedRepo, selectedUsers, repoFileMap, userCategoryCommitsMap, loadingUsers]);
  const getCategoryDistributionForUser = (username) => {
    return (
      userCategoryCommitsMap[selectedRepo]?.[username] || {
        backend: 0,
        frontend: 0,
        docs: 0,
        config: 0,
        other: 0,
      }
    );
  };
  const toggleFavorite = (username) => {
    const updated = favorites.includes(username)
      ? favorites.filter((u) => u !== username)
      : [...favorites, username];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };
  // --- CHANGED: filterCommits function ---
  // Wrapped with useCallback and dependencies added
  const filterCommits = useCallback((commits) =>
    commits.filter((c) => {
      // c.commit.message or c.message, depending on API call
      const message = c.commit?.message || c.message || ""; 
      if (commitFilter !== "all" && getCommitType(message) !== commitFilter)
        return false;
      // c.commit.author.date or c.author?.date
      const date = c.commit?.author?.date || c.author?.date || "";
      if (!isInDateRange(date, dateFrom, dateTo)) return false;
      return true;
    }), [commitFilter, dateFrom, dateTo] // Dependencies added
  );
  // --- CHANGED END: filterCommits function ---
  const getWeeklyCommitData = () => {
    const allWeeks = new Set();
    const userWeeklyMap = {};
    selectedUsers.forEach((user) => {
      const commits = userCommitsMap[user] || [];
      const filtered = filterCommits(commits);
      const grouped = groupCommitsByWeek(filtered);
      userWeeklyMap[user] = grouped;
      grouped.forEach((g) => allWeeks.add(g.week));
    });
    const sortedWeeks = Array.from(allWeeks).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    return sortedWeeks.map((week) => {
      const entry = { week };
      selectedUsers.forEach((user) => {
        const userWeekData = userWeeklyMap[user] || [];
        const found = userWeekData.find((w) => w.week === week);
        entry[user] = found ? found.count : 0;
      });
      return entry;
    });
  };
  const openOwnerModal = () => {
    const trimmed = ownerSearch.trim();
    if (!trimmed) return setError("Owner name cannot be empty.");
    setOwnerForModal(trimmed);
    setShowOwnerModal(true);
    setError(null);
  };
  const Capitalized = ({ text }) => {
    if (!text) return null;
    return text
      .split(" ")
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  };
  const renderHeader = () => (
    <header
      style={{
        marginBottom: 30,
        padding: "20px 30px",
        borderRadius: 16,
        background: theme.headerBg,
        color: "#fff",
        boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 20
      }}
    >
      <h1
        style={{
          fontWeight: 600,
          fontSize: 28,
          margin: "10px 0",
          textShadow: "0 2px 4px rgba(0,0,0,0.2)"
        }}
      >
        GitHub Multi Repo Contributor Tracker
      </h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15
        }}
      >
        <button
          onClick={() => setShowInfoModal(true)}
          style={{
            padding: "8px 16px",
            borderRadius: 50,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 500,
            transition: "background 0.3s"
          }}
          onMouseOver={(e) =>
            (e.target.style.background = "rgba(255,255,255,0.25)")
          }
          onMouseOut={(e) =>
            (e.target.style.background = "rgba(255,255,255,0.15)")
          }
        >
          ℹ️ Info
        </button>
        <label
          style={{
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <div
            style={{
              width: 45,
              height: 24,
              background: darkMode ? "#3949ab" : "#1976d2",
              borderRadius: 12,
              position: "relative",
              padding: 2
            }}
          >
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              style={{
                opacity: 0,
                position: "absolute",
                width: "100%",
                height: "100%",
                cursor: "pointer",
                zIndex: 2
              }}
            />
            <div
              style={{
                width: 20,
                height: 20,
                background: "#fff",
                borderRadius: "50%",
                transform: darkMode
                  ? "translateX(20px)"
                  : "translateX(0)",
                transition: "transform 0.3s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            />
          </div>
          <span style={{ color: "#fff" }}>
            {darkMode ? "🌙 Dark" : "☀️ Light"}
          </span>
        </label>
      </div>
    </header>
  );
  // --- CHANGED: CommitDetails Render Function ---
  // CommitDetails component with onSpellCheck prop added
  const renderCommitDetails = () => (
    selectedUsers.map(user => (
      <CommitDetails
        key={user}
        username={user}
        commits={filterCommits(userCommitsMap[user] || [])}
        darkMode={darkMode}
        onSpellCheck={performSpellCheck} // New prop
      />
    ))
  );
  // --- CHANGED END: CommitDetails Render Function ---
  // --- NEW: Fetch All Filtered Commits Function ---
  // Instead of using GitHub API's since/until filters based on committer-date,
  // we fetch all commits and then filter by author-date in JS.
  const fetchAllFilteredCommits = useCallback(async () => {
    if (!selectedRepo) return;
    setIsFetchingAllCommits(true);
    setError(null);
    try {
      let allCommits = []; // This will contain detailed commit objects
      let page = 1;
      const per_page = 100;
      // NOTE: since/until query parameters have been removed.
      // Because GitHub API applies these to committer-date.
      // We want to filter by author-date (using filterCommits).
      while (true) {
        // Note: This call fetches commits for the entire repo, not contributor-specific.
        // Date filter is NOT applied at the API level, but in JS (filterCommits).
        const res = await fetch(
          `https://api.github.com/repos/${selectedRepo}/commits?per_page=${per_page}&page=${page}`, // <-- since/until removed
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Rate limit exceeded");
          }
          // Break loop for other errors
          console.warn(`Failed to fetch commits page ${page}`, res.status);
          break;
        }
        const data = await res.json();
        if (data.length === 0) break;
        // Fetch details for each commit (for files info)
        const detailedCommits = await Promise.all(
          data.map(async (commit) => {
            // Fetch detailed info using commit SHA
            const detailRes = await fetch(commit.url, { headers: getAuthHeaders() });
            if (!detailRes.ok) {
              console.warn(`Failed to fetch details for commit ${commit.sha}`);
              // If details can't be fetched, try to use basic info
              return commit; 
            }
            return await detailRes.json();
          })
        );
        allCommits = allCommits.concat(detailedCommits);
        page++;
        // Safety measure: Prevent infinite loop if there are too many pages
        if (page > 10) { // For example, max 1000 commits
            console.warn("Max page limit reached for all commits fetch.");
            break;
        }
      }
      // Apply date and commit type filter COMPLETELY here (using filterCommits)
      // filterCommits function already works with author.date.
      const finalFilteredCommits = filterCommits(allCommits);
      setAllFilteredCommits(finalFilteredCommits);
      setIsFetchingAllCommits(false); // <-- Moved here
    } catch (error) {
      console.error("Error fetching all filtered commits:", error);
      setError(error.message || "Error fetching commits for date range.");
      setAllFilteredCommits([]); // Clear list on error
      setIsFetchingAllCommits(false); // <-- Also moved here
    }
    // finally block removed
  }, [selectedRepo, dateFrom, dateTo, commitFilter, filterCommits]); // filterCommits dependency added
  // --- NEW END: Fetch All Filtered Commits Function ---
  // --- NEW: Trigger on Date or Commit Type Change ---
  useEffect(() => {
    if (selectedRepo) { // Only run if a repo is selected
        fetchAllFilteredCommits();
    } else {
        setAllFilteredCommits([]); // Clear list if no repo is selected
        setIsFetchingAllCommits(false); // Set loading state to false
    }
  }, [selectedRepo, dateFrom, dateTo, commitFilter, fetchAllFilteredCommits]); // fetchAllFilteredCommits dependency added
  // --- NEW END: Trigger on Date or Commit Type Change ---
  return (
    <div
      style={{
        maxWidth: 1400,
        margin: "auto",
        padding: 20,
        fontFamily:
          "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: theme.backgroundColor,
        color: theme.color,
        minHeight: "100vh"
      }}
    >
      {renderHeader()}
      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} darkMode={darkMode} />
      )}
      {/* --- NEW: SpellCheckModal Render --- */}
      {/* Z-index fix will also take effect here */}
      {showSpellCheckModal && (
        <SpellCheckModal
          message={currentSpellCheckMessage}
          onClose={() => setShowSpellCheckModal(false)}
          darkMode={darkMode}
          spellCheckResult={spellCheckResult}
          isChecking={isSpellCheckLoading}
        />
      )}
      {/* --- NEW END: SpellCheckModal Render --- */}
      {/* --- NEW: RecentCommitsModal Render --- */}
      {/* RecentCommitsModal with onSpellCheck prop added */}
      {showRecentCommitsModal && (
        <RecentCommitsModal
          onClose={() => setShowRecentCommitsModal(false)}
          darkMode={darkMode}
          recentCommits={recentCommits}
          onRepoSelect={(repoName) => {
            setSelectedRepo(repoName);
            setShowRecentCommitsModal(false);
          }}
          onSpellCheck={performSpellCheck} // New prop
        />
      )}
      {/* --- NEW END: RecentCommitsModal Render --- */}
      
      {/* --- NEW: Rate Limit Info Render --- */}
      <RateLimitInfo darkMode={darkMode} theme={theme} />
      {/* --- NEW END: Rate Limit Info Render --- */}
      
      <section
        style={{
          marginBottom: 30,
          display: "flex",
          flexWrap: "wrap",
          gap: 15,
          alignItems: "center"
        }}
      >
        <input
          type="text"
          placeholder="Add repo (owner/repo)"
          value={newRepo}
          onChange={(e) => setNewRepo(e.target.value)}
          style={{
            flex: "1 1 300px",
            padding: "12px 20px",
            backgroundColor: theme.inputBg,
            color: theme.color,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: 10,
            fontSize: 16,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
          }}
          onKeyDown={(e) => e.key === "Enter" && addRepo(newRepo)}
        />
        <button
          onClick={() => addRepo(newRepo)}
          style={{
            padding: "12px 25px",
            background: theme.buttonBg,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 16,
            transition: "background 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.background = theme.buttonHoverBg)}
          onMouseOut={(e) => (e.target.style.background = theme.buttonBg)}
        >
          ➕ Add Repo
        </button>
        <input
          type="text"
          placeholder="Search repos by owner"
          value={ownerSearch}
          onChange={(e) => setOwnerSearch(e.target.value)}
          style={{
            flex: "1 1 250px",
            padding: "12px 20px",
            backgroundColor: theme.inputBg,
            color: theme.color,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: 10,
            fontSize: 16,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
          }}
          onKeyDown={(e) => e.key === "Enter" && openOwnerModal()}
        />
        <button
          onClick={openOwnerModal}
          style={{
            padding: "12px 25px",
            background: "#6a1b9a",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 16,
            transition: "background 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.background = "#4a148c")}
          onMouseOut={(e) => (e.target.style.background = "#6a1b9a")}
        >
          🔍 Search Owner
        </button>
        {/* --- NEW: Recent Commits Button --- */}
        <button
          onClick={fetchRecentCommits}
          disabled={recentCommitsLoading || repos.length === 0}
          style={{
            padding: "12px 25px",
            background: recentCommitsLoading ? "#9e9e9e" : "#ff9800",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: recentCommitsLoading || repos.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 500,
            fontSize: 16,
            transition: "background 0.3s",
            opacity: recentCommitsLoading || repos.length === 0 ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!recentCommitsLoading && repos.length > 0) {
              e.target.style.background = "#f57c00";
            }
          }}
          onMouseOut={(e) => {
            if (!recentCommitsLoading && repos.length > 0) {
              e.target.style.background = "#ff9800";
            }
          }}
        >
          {recentCommitsLoading ? "⏳ Loading..." : "🕒 Recent Commits"}
        </button>
        {/* --- NEW END: Recent Commits Button --- */}
      </section>
      {error && (
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: darkMode ? "#2e1e1e" : "#ffebee",
            color: "#e53935",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          ⚠️ {error}
        </div>
      )}
      {repos.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <h3
            style={{
              marginBottom: 15,
              paddingBottom: 10,
              borderBottom: `1px solid ${theme.borderColor}`,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <span>📦 Repositories</span>
            <span
              style={{
                background: theme.buttonBg,
                color: "#fff",
                borderRadius: "50%",
                width: 25,
                height: 25,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14
              }}
            >
              {repos.length}
            </span>
          </h3>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            {repos.map((r) => (
              <div
                key={r}
                style={{
                  padding: "12px 20px",
                  background:
                    r === selectedRepo ? theme.buttonBg : theme.cardBg,
                  color:
                    r === selectedRepo ? "#fff" : theme.color,
                  border: `1px solid ${theme.borderColor}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: theme.cardShadow,
                  transition: "all 0.2s"
                }}
                onClick={() => setSelectedRepo(r)}
              >
                <span
                  style={{
                    fontWeight: r === selectedRepo ? 600 : 500
                  }}
                >
                  {r}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRepo(r);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "none",
                    color: "inherit",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.background = "rgba(0,0,0,0.3)")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.background = "rgba(0,0,0,0.2)")
                  }
                  aria-label={`Remove ${r}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {selectedRepo && contributors.length > 0 && (
        <div
          style={{
            background: theme.cardBg,
            padding: 25,
            borderRadius: 16,
            marginBottom: 30,
            boxShadow: theme.cardShadow,
            border: `1px solid ${theme.borderColor}`
          }}
        >
          <h3
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: darkMode ? "#64b5f6" : "#1976d2"
            }}
          >
            📊 Repository Analysis:{" "}
            <span style={{ fontWeight: 500 }}>
              <Capitalized text={selectedRepo} />
            </span>
          </h3>
          <div
            style={{
              display: "flex",
              gap: 30,
              flexWrap: "wrap",
              marginBottom: 25
            }}
          >
            <div style={{ minWidth: 250 }}>
              <h4 style={{ marginBottom: 10, color: theme.color }}>
                Commit Statistics
              </h4>
              <div
                style={{
                  display: "flex",
                  gap: 15,
                  flexWrap: "wrap"
                }}
              >
                <div
                  style={{
                    background: darkMode
                      ? "rgba(25, 118, 210, 0.2)"
                      : "rgba(25, 118, 210, 0.1)",
                    padding: 15,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: darkMode ? "#90caf9" : "#1976d2"
                    }}
                  >
                    Total Commits
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: theme.color
                    }}
                  >
                    {contributors.reduce(
                      (sum, c) => sum + c.contributions,
                      0
                    )}
                  </div>
                </div>
                <div
                  style={{
                    background: darkMode
                      ? "rgba(56, 142, 60, 0.2)"
                      : "rgba(56, 142, 60, 0.1)",
                    padding: 15,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: darkMode ? "#a5d6a7" : "#388e3c"
                    }}
                  >
                    Contributors
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: theme.color
                    }}
                  >
                    {contributors.length}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h4 style={{ marginBottom: 10, color: theme.color }}>
                Top Contributors
              </h4>
              <div style={{ width: "100%", height: 200 }}>
                <BarChart
                  width={500}
                  height={200}
                  data={contributors
                    .slice(0, 5)
                    .map((c) => ({
                      name: c.login,
                      commits: c.contributions
                    }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkMode ? "#444" : "#eee"}
                  />
                  <XAxis dataKey="name" stroke={theme.color} />
                  <YAxis stroke={theme.color} />
                  <Tooltip
                    contentStyle={{
                      background: darkMode ? "#333" : "#fff",
                      border: `1px solid ${theme.borderColor}`,
                      borderRadius: 10
                    }}
                    itemStyle={{ color: theme.color }}
                  />
                  <Bar
                    dataKey="commits"
                    fill={darkMode ? "#64b5f6" : "#1976d2"}
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedRepo && (
        <div
          style={{
            background: theme.cardBg,
            padding: 25,
            borderRadius: 16,
            marginBottom: 30,
            boxShadow: theme.cardShadow,
            border: `1px solid ${theme.borderColor}`
          }}
        >
          <h3
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: darkMode ? "#64b5f6" : "#1976d2"
            }}
          >
            📁 File Structure Breakdown
          </h3>
          {selectedRepoIsLoading && !repoFileTreeMap[selectedRepo] ? (
            <div>Loading file structure... ⏳</div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  justifyContent: "space-between"
                }}
              >
                {Object.entries(CATEGORY_RULES).map(([category]) => {
                  const count = (repoFileTreeMap[selectedRepo]?.[category] || [])
                    .length;
                  return (
                    <div
                      key={category}
                      style={{
                        flex: "1 0 200px",
                        padding: 20,
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: 10,
                        minWidth: 180,
                        backgroundColor: darkMode
                          ? "rgba(100, 181, 246, 0.05)"
                          : "rgba(122, 208, 255, 0.05)",
                        boxShadow: theme.cardShadow
                      }}
                    >
                      <h4
                        style={{
                          marginBottom: 5,
                          fontWeight: 600,
                          color: darkMode ? "#90caf9" : "#1976d2"
                        }}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </h4>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>
                        {count}
                      </div>
                      <div style={{ fontSize: 12, color: darkMode ? "#bbb" : "#666" }}>
                        {count === 1 ? "file" : "files"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  background: darkMode
                    ? "rgba(40, 40, 50, 0.2)"
                    : "rgba(245, 245, 255, 0.2)",
                  padding: 15,
                  borderRadius: 8
                }}
              >
                <h4 style={{ marginBottom: 15 }}>
                  🔍 File Categorization
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 15,
                    border: `1px solid ${theme.borderColor}`,
                    background: darkMode ? "#212121" : "#f5f5f5",
                    padding: 15,
                    borderRadius: 8
                  }}
                >
                  {Object.entries(CATEGORY_RULES).map(
                    ([category, extensions]) => (
                      <div
                        key={category}
                        style={{
                          border: darkMode
                            ? "1px solid #383838"
                            : "1px solid #e5e5e5",
                          borderRadius: 6,
                          padding: 10,
                          background: darkMode ? "#1e1e1e" : "#fff",
                          boxShadow: theme.cardShadow
                        }}
                      >
                        <h5
                          style={{
                            fontWeight: 600,
                            marginBottom: 5,
                            color: darkMode ? "#90caf9" : "#1976d2"
                          }}
                        >
                          {category.charAt(0).toUpperCase() +
                            category.slice(1)}
                        </h5>
                        <div
                          style={{
                            fontSize: 12,
                            fontStyle: "italic",
                            color: darkMode ? "#bbb" : "#666"
                          }}
                        >
                          File extensions: {extensions.join(", ")}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {contributors.length > 0 && (
        <div
          style={{
            background: theme.cardBg,
            padding: 25,
            borderRadius: 16,
            marginBottom: 30,
            boxShadow: theme.cardShadow,
            border: `1px solid ${theme.borderColor}`
          }}
        >
          <h3
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: darkMode ? "#64b5f6" : "#1976d2"
            }}
          >
            👥 Contributors
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  backgroundColor: darkMode
                    ? "rgba(57, 73, 171, 0.3)"
                    : "rgba(25, 118, 210, 0.1)"
                }}
              >
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 15px",
                      color: darkMode ? "#bb86fc" : "#1976d2"
                    }}
                  >
                    User
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 15px",
                      color: darkMode ? "#bb86fc" : "#1976d2"
                    }}
                  >
                    Commits
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 15px",
                      color: darkMode ? "#bb86fc" : "#1976d2"
                    }}
                  >
                    Select
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 15px",
                      color: darkMode ? "#bb86fc" : "#1976d2"
                    }}
                  >
                    Favorite
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c, index) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: `1px solid ${theme.borderColor}`,
                      backgroundColor:
                        index % 2 === 0
                          ? darkMode
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.02)"
                          : "transparent"
                    }}
                  >
                    <td style={{ padding: "12px 15px" }}>
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textDecoration: "none",
                          color: theme.color
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: darkMode ? "#333" : "#eee",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          👤
                        </span>
                        <span style={{ fontWeight: 500 }}>
                          {c.login}
                        </span>
                      </a>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "12px 15px",
                        fontWeight: 500
                      }}
                    >
                      {c.contributions}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "12px 15px"
                      }}
                    >
                      <label style={{ display: "inline-block", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(c.login)}
                          onChange={() => toggleUserSelection(c.login)}
                          style={{
                            width: 20,
                            height: 20,
                            cursor: "pointer",
                            accentColor: darkMode ? "#3949ab" : "#1976d2"
                          }}
                        />
                      </label>
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "12px 15px"
                      }}
                    >
                      <button
                        onClick={() => toggleFavorite(c.login)}
                        style={{
                          cursor: "pointer",
                          background: favorites.includes(c.login)
                            ? darkMode
                              ? "rgba(255, 215, 0, 0.3)"
                              : "rgba(255, 215, 0, 0.2)"
                            : "transparent",
                          border: "none",
                          borderRadius: "50%",
                          width: 36,
                          height: 36,
                          fontSize: 18,
                          transition: "all 0.2s",
                          color: favorites.includes(c.login) ? "#ffd700" : theme.color
                        }}
                        title={
                          favorites.includes(c.login)
                            ? "Unfavorite"
                            : "Mark as favorite"
                        }
                      >
                        {favorites.includes(c.login) ? "★" : "☆"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* --- CHANGED: selectedUsers.length > 0 check removed --- */}
      {/* Will now work without contributor selection */}
      <div
        style={{
          background: theme.cardBg,
          padding: 25,
          borderRadius: 16,
          marginBottom: 30,
          boxShadow: theme.cardShadow,
          border: `1px solid ${theme.borderColor}`
        }}
      >
        <h3
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: darkMode ? "#64b5f6" : "#1976d2"
          }}
        >
          🔍 Commit Analysis
        </h3>
        <div
          style={{
            background: darkMode
              ? "rgba(40,40,50,0.3)"
              : "rgba(245,245,255,0.5)",
            padding: 20,
            borderRadius: 12,
            marginBottom: 25
          }}
        >
          <h4
            style={{
              marginBottom: 15,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            ⚙️ Filter Settings
          </h4>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label
                style={{ display: "block", marginBottom: 8, fontWeight: 500 }}
              >
                Commit Type:
              </label>
              <select
                value={commitFilter}
                onChange={(e) => setCommitFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: 8,
                  border: `1px solid ${theme.borderColor}`,
                  background: theme.inputBg,
                  color: theme.color,
                  fontSize: 15
                }}
              >
                <option value="all">All Types</option>
                {COMMIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label
                style={{ display: "block", marginBottom: 8, fontWeight: 500 }}
              >
                Date Range:
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 15px",
                    borderRadius: 8,
                    border: `1px solid ${theme.borderColor}`,
                    background: theme.inputBg,
                    color: theme.color
                  }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 15px",
                    borderRadius: 8,
                    border: `1px solid ${theme.borderColor}`,
                    background: theme.inputBg,
                    color: theme.color
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* --- CHANGED: DateRangeSummary now uses all commits --- */}
        <DateRangeSummary 
          commits={allFilteredCommits} 
          darkMode={darkMode} 
          theme={theme} 
        />
        {/* --- CHANGED END: DateRangeSummary now uses all commits --- */}
        {/* --- NEW: Loading State --- */}
        {isFetchingAllCommits && (
          <div style={{ textAlign: 'center', padding: '20px', color: darkMode ? "#bbb" : "#666" }}>
            Loading commits for date range...
          </div>
        )}
        {/* --- NEW END: Loading State --- */}
        {/* --- CONDITIONAL: Sections shown if contributors are selected --- */}
        {selectedUsers.length > 0 && (
          <>
            <div style={{ marginBottom: 30 }}>
              <h4
                style={{
                  marginBottom: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}
              >
                📈 Weekly Commit Comparison
              </h4>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyCommitData()}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={darkMode ? "#444" : "#eee"}
                    />
                    <XAxis dataKey="week" stroke={theme.color} />
                    <YAxis stroke={theme.color} />
                    <Tooltip
                      contentStyle={{
                        background: darkMode ? "#333" : "#fff",
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: 10
                      }}
                      itemStyle={{ color: theme.color }}
                    />
                    {selectedUsers.map((user, idx) => (
                      <Bar
                        key={user}
                        dataKey={user}
                        fill={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
                        radius={[5, 5, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ marginBottom: 30 }}>
              <h4
                style={{
                  marginBottom: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}
              >
                📁 Code Category Breakdown
              </h4>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 15,
                  justifyContent: "center"
                }}
              >
                {selectedUsers.map((user, idx) => {
                  const dist = getCategoryDistributionForUser(user);
                  if (!dist) return null;
                  return (
                    <div
                      key={user}
                      style={{
                        flex: "0 0 320px",
                        padding: 20,
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: 12,
                        backdropFilter: "blur(12px)",
                        boxShadow: theme.cardShadow,
                        background: theme.cardBg
                      }}
                    >
                      <h5
                        style={{
                          marginBottom: 15,
                          fontWeight: 600
                        }}
                      >
                        {user} - Code Contribution
                      </h5>
                      {Object.entries(dist).map(([category, count]) => (
                        <div key={category} style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>
                              {category}
                            </span>
                            <span style={{ fontSize: 14 }}>
                              {count} {count === 1 ? "commit" : "commits"}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 12,
                              borderRadius: 6,
                              overflow: "hidden",
                              background: theme.borderColor
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                background: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
                                width:
                                  Object.values(dist).reduce(
                                    (sum, c) => sum + c,
                                    0
                                  ) > 0
                                    ? `${Math.round(
                                        (count /
                                          Object.values(dist).reduce(
                                            (sum, c) => sum + c,
                                            0
                                          )) *
                                          100
                                      )}%`
                                    : "0%",
                                transition: "width 0.5s"
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            {renderCommitDetails()}
          </>
        )}
        {/* --- CONDITIONAL END: Sections shown if contributors are selected --- */}
      </div>
      {/* --- CHANGED END: selectedUsers.length > 0 check removed --- */}
      {showOwnerModal && (
        <OwnerRepoModal
          owner={ownerForModal}
          onClose={() => setShowOwnerModal(false)}
          darkMode={darkMode}
          onSelectRepos={addRepos}
        />
      )}
    </div>
  );
}
export default App;