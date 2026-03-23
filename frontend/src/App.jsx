import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Risk Gauge ──────────────────────────────────────────────
function RiskGauge({ score = 15, level = 'critical', maxScore = 20 }) {
  const fraction  = Math.min(Math.max(score / maxScore, 0), 1)
  const cx = 150, cy = 148
  const arcR    = 118   // arc radius
  const needleR = 106   // needle length

  // angle in standard math (y-up): score=0 → π (leftmost), score=max → 0 (rightmost)
  const angle = Math.PI * (1 - fraction)

  // Needle tip (SVG coords: y-down)
  const dx = Math.cos(angle)          // SVG x-direction toward tip
  const dy = -Math.sin(angle)         // SVG y-direction toward tip
  const nx = cx + needleR * dx
  const ny = cy + needleR * dy

  // Perpendicular unit vector (rotated 90° CW from needle direction)
  const px = Math.sin(angle)          // = -dy
  const py = Math.cos(angle)          // =  dx
  const hw = 6                        // half base-width in px

  // Needle base corners (straddling the pivot, perpendicular to needle axis)
  const b1x = cx + hw * px,  b1y = cy + hw * py
  const b2x = cx - hw * px,  b2y = cy - hw * py

  // Needle tail (short extension past pivot, opposite side from tip)
  const tailLen = 20
  const tx = cx - tailLen * dx
  const ty = cy - tailLen * dy

  // Colour driven by risk level
  const levelColors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }
  const col = levelColors[level] || '#ef4444'

  // Arc endpoints
  const arcLeft  = cx - arcR   //  32
  const arcRight = cx + arcR   // 268

  return (
    <div className="gauge-outer">
      <svg viewBox="0 0 300 165" className="gauge-svg">
        <defs>
          {/* Smooth green → amber → red gradient mapped left→right across the arc */}
          <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22c55e"/>
            <stop offset="28%"  stopColor="#a3e635"/>
            <stop offset="52%"  stopColor="#f59e0b"/>
            <stop offset="74%"  stopColor="#f97316"/>
            <stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
          {/* Needle glow */}
          <filter id="nGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Arc glow */}
          <filter id="aGlow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Background track ── */}
        <path
          d={`M ${arcLeft} ${cy} A ${arcR} ${arcR} 0 0 1 ${arcRight} ${cy}`}
          stroke="rgba(255,255,255,0.07)" strokeWidth="18" fill="none" strokeLinecap="round"
        />

        {/* ── Gradient colour arc ── */}
        <path
          d={`M ${arcLeft} ${cy} A ${arcR} ${arcR} 0 0 1 ${arcRight} ${cy}`}
          stroke="url(#riskGrad)" strokeWidth="13" fill="none" strokeLinecap="round"
          filter="url(#aGlow)"
        />

        {/* ── Tick marks at 0 / 25 / 50 / 75 / 100 % ── */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const a  = Math.PI * (1 - f)
          const x1 = cx + (arcR - 9)  * Math.cos(a),  y1 = cy - (arcR - 9)  * Math.sin(a)
          const x2 = cx + (arcR + 9)  * Math.cos(a),  y2 = cy - (arcR + 9)  * Math.sin(a)
          const isEndTick = i === 3 || i === 4
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isEndTick ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.4)'}
              strokeWidth={i === 0 || i === 4 ? 2.5 : 1.5}
            />
          )
        })}

        {/* ── Needle drop-shadow ── */}
        <polygon
          points={`${nx},${ny} ${b1x},${b1y} ${tx},${ty} ${b2x},${b2y}`}
          fill="rgba(0,0,0,0.55)" transform="translate(2,3)"
        />

        {/* ── Needle (sleek dark polygon) ── */}
        <polygon
          points={`${nx},${ny} ${b1x},${b1y} ${tx},${ty} ${b2x},${b2y}`}
          fill="#0c1c2e"
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.75"
          filter="url(#nGlow)"
        />

        {/* ── Pivot cap ── */}
        <circle cx={cx} cy={cy} r="13" fill="#060d1a" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="6"  fill={col}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }}
        />
      </svg>

      {/* ── Score & level badge (rendered as DOM, not inside SVG) ── */}
      <div className="gauge-score-display">
        <div className="gauge-score-value">Risk Score: {score}</div>
        <div className="gauge-level-badge" style={{ background: col, boxShadow: `0 0 18px ${col}99` }}>
          Level: {level.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

// ── Finding Badges ──────────────────────────────────────────
function FindingBadges({ findings }) {
  const counts = {}
  findings.forEach(f => { counts[f.risk] = (counts[f.risk] || 0) + 1 })
  const badges = [
    { level: 'critical', color: '#ff2244', glow: 'rgba(255,34,68,0.4)',  icon: '🔴', desc: 'Plaintext password detected' },
    { level: 'high',     color: '#ff6422', glow: 'rgba(255,100,34,0.4)', icon: '🟠', desc: 'API key / token exposed' },
    { level: 'medium',   color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', icon: '🟡', desc: 'System stack trace / PII' },
    { level: 'low',      color: '#00ff88', glow: 'rgba(0,255,136,0.3)',  icon: '🟢', desc: 'Info-level disclosure' },
  ]
  return (
    <div className="finding-badges">
      {badges.filter(b => counts[b.level]).map(b => (
        <div key={b.level} className="finding-badge" style={{ borderColor: b.color, boxShadow: `0 0 10px ${b.glow}` }}>
          <span className="badge-icon">{b.icon}</span>
          <div>
            <div className="badge-count" style={{ color: b.color }}>{counts[b.level]} {b.level.toUpperCase()}</div>
            <div className="badge-desc">{b.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Client-side keyword risk rules — evaluated even before the API is called
// Each entry: [regex, riskLevel]  (higher entries win via PRIORITY order)
const KEYWORD_RULES = [
  // ── Critical ──────────────────────────────────────────────────
  [/password|passwd|pwd/i,                                    'critical'],
  [/api[_\-\s]?key|secret[_\-\s]?key|private[_\-\s]?key/i,  'critical'],
  [/bearer\s+[a-z0-9\-._~+/]+=*/i,                           'critical'],
  [/jwt|access[_\-\s]?token|auth[_\-\s]?token/i,             'critical'],
  // ── High ──────────────────────────────────────────────────────
  [/failed\s+login|login\s+failed|login\s+attempt/i,         'high'],
  [/authentication\s+failed|auth\s+failed|auth\s+error/i,    'high'],
  [/brute[\s_-]?force|too\s+many\s+(requests|attempts)/i,    'high'],
  [/unauthorized|access\s+denied|permission\s+denied/i,      'high'],
  [/sql\s+error|syntax\s+error.*sql|unclosed\s+quotation/i,  'high'],
  // ── Medium ────────────────────────────────────────────────────
  [/exception|stack\s+trace|traceback|null\s+pointer/i,      'medium'],
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,               'medium'], // bare IP in log line
  [/error|warning|warn\b/i,                                  'medium'],
]

// ── Log Viewer ──────────────────────────────────────────────
function LogViewer({ content, findings = [] }) {
  const lines = content.split('\n')

  // Build risk map from API findings (highest severity wins)
  const riskMap = {}
  const PRIORITY = ['critical', 'high', 'medium', 'low']
  findings.forEach(f => {
    if (!riskMap[f.line] || PRIORITY.indexOf(f.risk) < PRIORITY.indexOf(riskMap[f.line])) {
      riskMap[f.line] = f.risk
    }
  })

  // Client-side keyword scan — runs over every line, respects severity priority
  lines.forEach((line, i) => {
    for (const [re, riskLevel] of KEYWORD_RULES) {
      if (re.test(line)) {
        const n = i + 1
        if (!riskMap[n] || PRIORITY.indexOf(riskLevel) < PRIORITY.indexOf(riskMap[n])) {
          riskMap[n] = riskLevel
        }
        break  // first matching rule wins for this line
      }
    }
  })

  // Style maps
  const bgMap = {
    critical : 'rgba(180, 0,  30, 0.28)',
    high     : 'rgba(220, 80,  0, 0.22)',
    medium   : 'rgba(200,140,  0, 0.20)',
    low      : 'rgba(  0,200,100, 0.10)',
  }
  const borderMap = { critical: '#ff1a3c', high: '#ff6422', medium: '#f59e0b', low: '#00e07a' }
  const labelMap  = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }

  return (
    <div className="log-viewer-box">
      <div className="log-header">
        <span className="log-title">📋 Log Viewer</span>
        <span className="log-line-count">{lines.length} lines</span>
      </div>
      <div className="log-scroll">
        {lines.map((line, i) => {
          const n    = i + 1
          const risk = riskMap[n] || null
          return (
            <div
              key={n}
              className={`log-line${risk ? ' flagged' : ''}`}
              style={risk ? {
                background  : bgMap[risk],
                borderLeft  : `3px solid ${borderMap[risk]}`,
              } : {}}
            >
              <span className="log-num">{n}</span>
              <span className="log-text">{line || '\u00a0'}</span>
              {risk && (
                <span className="log-risk-tag" style={{ background: borderMap[risk] }}>
                  {labelMap[risk]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('log')
  const [file, setFile] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [sqlContent, setSqlContent] = useState('')
  const [chatContent, setChatContent] = useState('')
  const [maskData, setMaskData] = useState(true)
  const [blockHighRisk, setBlockHighRisk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [logContent, setLogContent] = useState('')

  // File dropzone — accepts log, txt, pdf, doc, docx
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain':       ['.txt', '.log'],
      'application/pdf':  ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    onDrop: async (accepted) => {
      if (accepted.length > 0) {
        const f = accepted[0]
        setFile(f)
        // Only pre-read plaintext files for the log viewer; PDFs/DOCs handled server-side
        const ext = f.name.split('.').pop().toLowerCase()
        if (['txt', 'log'].includes(ext)) {
          setLogContent(await f.text())
        } else {
          setLogContent('')  // binary file — server extracts text
        }
      }
    }
  })

  const handleAnalyze = async () => {
    setLoading(true)
    setResults(null)
    try {
      const fd = new FormData()
      if ((activeTab === 'log' || activeTab === 'file') && file) {
        fd.append('input_type', 'file')
        fd.append('file', file)
      } else if (activeTab === 'text') {
        fd.append('input_type', 'text')
        fd.append('content', textContent)
      } else if (activeTab === 'sql') {
        fd.append('input_type', 'sql')
        fd.append('content', sqlContent)
      } else if (activeTab === 'chat') {
        fd.append('input_type', 'chat')
        fd.append('content', chatContent)
      } else {
        alert('Please provide input to analyze')
        setLoading(false)
        return
      }
      fd.append('mask', maskData)
      fd.append('block_high_risk', blockHighRisk)
      fd.append('log_analysis', true)
      const res = await axios.post(`${API_URL}/analyze`, fd)
      setResults(res.data)
      // For binary files (PDF/DOC) the server extracts text — use it for the log viewer
      if (res.data.extracted_text && !logContent) {
        setLogContent(res.data.extracted_text)
      }
    } catch (err) {
      console.error(err)
      alert('Analysis failed. Check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  const riskColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="shield-icon">🛡️</span>
          </div>
          <div className="header-text">
            <h1 className="header-title">AI Secure Data Intelligence Platform</h1>
            <p className="header-sub">AI Gateway&nbsp;·&nbsp;Data Scanner&nbsp;·&nbsp;Log Analyzer&nbsp;·&nbsp;Risk Engine</p>
          </div>
          <div className="header-status">
            <span className="status-dot"></span>
            <span className="status-label">LIVE</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="main-layout">

        {/* LEFT COLUMN */}
        <div className="col-left">
          {/* Input card */}
          <div className="glass-card">
            <div className="card-label">INPUT &amp; EXECUTION</div>
            <h2 className="panel-title">Analyze Input</h2>

            <div className="tabs">
              {[
                ['log',  '📋 Log File'],
                ['file', '📎 PDF / DOC'],
                ['text', '📝 Text'],
                ['sql',  '🗄️ SQL'],
                ['chat', '💬 Chat'],
              ].map(([id, label]) => (
                <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(id); setFile(null); setLogContent('') }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {/* ── Log File tab ── */}
              {activeTab === 'log' && (
                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`}>
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="file-ready">
                      <span className="file-icon">📄</span>
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{(file.size / 1024).toFixed(1)} KB&nbsp;·&nbsp;<span className="ready-tag">Ready ✓</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="drop-prompt">
                      <div className="drop-icon-row">📋&nbsp;&nbsp;📄</div>
                      <p className="drop-main">Drag &amp; drop a log file here or browse</p>
                      <p className="drop-sub">Supports .log · .txt</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── PDF / DOC File tab ── */}
              {activeTab === 'file' && (
                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`}>
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="file-ready">
                      <span className="file-icon">
                        {file.name.endsWith('.pdf') ? '📕' : '📘'}
                      </span>
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{(file.size / 1024).toFixed(1)} KB&nbsp;·&nbsp;<span className="ready-tag">Ready ✓</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="drop-prompt">
                      <div className="drop-icon-row">📕&nbsp;&nbsp;📘&nbsp;&nbsp;📄</div>
                      <p className="drop-main">Drag &amp; drop a document here or browse</p>
                      <p className="drop-sub">Supports .pdf · .doc · .docx · .txt</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Text tab ── */}
              {activeTab === 'text' && (
                <textarea className="input-textarea" placeholder="Paste raw text or log content here..." value={textContent} onChange={e => setTextContent(e.target.value)} rows={10}/>
              )}

              {/* ── SQL tab ── */}
              {activeTab === 'sql' && (
                <textarea className="input-textarea mono-input" placeholder="Paste a SQL query here...&#10;e.g. SELECT * FROM users WHERE id='1' OR '1'='1'" value={sqlContent} onChange={e => setSqlContent(e.target.value)} rows={10}/>
              )}

              {/* ── Chat tab ── */}
              {activeTab === 'chat' && (
                <div className="chat-input-wrap">
                  <div className="chat-hint">💬 Paste a conversation, chat export, or live customer support transcript below.</div>
                  <textarea className="input-textarea" placeholder="[User]: Hi, my password is hunter2&#10;[Agent]: Please never share your password..." value={chatContent} onChange={e => setChatContent(e.target.value)} rows={10}/>
                </div>
              )}
            </div>

            <div className="options">
              <div className="options-title">Policy Options</div>
              <label className="toggle-row">
                <div className="toggle-wrap">
                  <input type="checkbox" className="toggle-input" checked={maskData} onChange={e => setMaskData(e.target.checked)}/>
                  <span className="toggle-slider"></span>
                </div>
                <span className="toggle-label">🔒&nbsp; Mask Sensitive Data</span>
              </label>
              <label className="toggle-row">
                <div className="toggle-wrap">
                  <input type="checkbox" className="toggle-input" checked={blockHighRisk} onChange={e => setBlockHighRisk(e.target.checked)}/>
                  <span className="toggle-slider"></span>
                </div>
                <span className="toggle-label">🛡️&nbsp; Block High Risk Content</span>
              </label>
            </div>

            <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
              {loading
                ? <><span className="spinner"></span>&nbsp;ANALYZING...</>
                : <><span className="btn-icon">⚡</span>&nbsp;RUN ANALYTICS</>}
            </button>
          </div>

          {/* Log viewer (below input when file loaded) */}
          {logContent && (
            <div className="glass-card log-card">
              <LogViewer content={logContent} findings={results ? results.findings : []}/>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-right">
          <div className="glass-card">
            <div className="card-label">ANALYTICS &amp; INSIGHTS</div>
            <h2 className="panel-title">AI Insights &amp; Risk Report</h2>

            {results ? (
              <>
                {/* Gauge hero */}
                <div className="gauge-hero">
                  <RiskGauge score={results.risk_score} level={results.risk_level}/>
                  <FindingBadges findings={results.findings}/>
                </div>

                {/* ── Risk Explanation Card ──────────────────────── */}
                {results.risk_explanation && (
                  <div className="risk-explanation-card">
                    <div className="risk-explanation-label">🧠 AI Risk Explanation</div>
                    <p className="risk-explanation-text">{results.risk_explanation}</p>
                  </div>
                )}

                {results.blocked && (
                  <div className="blocked-banner">🚨 High Risk Content Blocked — output suppressed by policy engine</div>
                )}

                {/* AI Summary */}
                <div className="summary-box">
                  <div className="summary-label">🤖 AI Intelligence Summary</div>
                  <p>{results.insights.summary}</p>
                </div>

                {/* Findings table */}
                {results.findings.length > 0 && (
                  <div className="findings-section">
                    <div className="section-label">🔍 Findings Detail</div>
                    <div className="table-wrapper">
                      <table className="findings-table">
                        <thead><tr><th>Type</th><th>Risk</th><th>Line</th><th>Value</th></tr></thead>
                        <tbody>
                          {results.findings.map((f,i) => (
                            <tr key={i}>
                              <td>{f.type}</td>
                              <td><span className="risk-pill" style={{ background: riskColors[f.risk] }}>{f.risk}</span></td>
                              <td>{f.line}</td>
                              <td className="val-cell">{f.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── AI-Only Findings ──────────────────────────── */}
                {results.ai_only_findings && results.ai_only_findings.length > 0 && (
                  <div className="ai-findings-section">
                    <div className="section-label">🤖 AI Detected (Beyond Regex)</div>
                    <div className="ai-findings-list">
                      {results.ai_only_findings.map((f, i) => (
                        <div key={i} className="ai-finding-card">
                          <div className="ai-finding-top">
                            <span className="ai-finding-desc">{f.description}</span>
                            <span className="risk-pill" style={{ background: riskColors[f.severity] || '#475569' }}>
                              {f.severity}
                            </span>
                          </div>
                          {f.line_hint && (
                            <div className="ai-finding-hint">📍 {f.line_hint}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="ai-findings-note">
                      These patterns were detected by AI independently, without regex rules
                    </p>
                  </div>
                )}

                {/* Anomalies & Recommendations */}
                <div className="insights-section">
                  <div className="section-label">⚠️ Anomalies Detected</div>
                  <ul>{results.insights.anomalies.map((a,i) => <li key={i}>{a}</li>)}</ul>
                  <div className="section-label" style={{marginTop:'16px'}}>✅ Recommendations</div>
                  <ol>{results.insights.recommendations.map((r,i) => <li key={i}>{r}</li>)}</ol>
                </div>
              </>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔐</div>
                <p className="no-results-title">Awaiting Analysis</p>
                <p className="no-results-sub">Upload a log file or enter text, then click Run Analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

