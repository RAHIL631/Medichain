// frontend/src/pages/AIHealthAssistantPage.jsx
// AI Health Assistant — Phase 9
// Chat-style interface to ask medical questions and get plain-English explanations.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTION_CATEGORIES = [
  {
    label: '🩺 Diseases',
    suggestions: [
      'Explain heart disease',
      'What is diabetes?',
      'Tell me about hypertension',
      'What is stroke?',
      'Explain kidney disease',
    ],
  },
  {
    label: '💊 Medications',
    suggestions: [
      'Explain metformin',
      'What is lisinopril?',
      'Tell me about atorvastatin',
      'Explain aspirin',
      'What is warfarin?',
    ],
  },
  {
    label: '🧪 Medical Terms',
    suggestions: [
      'What does ischemic mean?',
      'Explain edema',
      'What is arrhythmia?',
      'What does eGFR mean?',
      'Explain atherosclerosis',
    ],
  },
  {
    label: '🔬 Lab Tests',
    suggestions: [
      'Explain HbA1c test',
      'What is creatinine?',
      'What does ALT mean?',
      'Explain troponin test',
      'What is eGFR?',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function detectIntent(text) {
  const lower = text.toLowerCase();

  // Disease explanations
  const diseases = ['heart disease', 'diabetes', 'hypertension', 'kidney disease', 'liver disease', 'stroke', 'cancer', 'asthma'];
  for (const d of diseases) {
    if (lower.includes(d)) return { type: 'explain-disease', param: 'disease', value: d };
  }

  // Drug explanations
  const drugs = ['metformin', 'lisinopril', 'atorvastatin', 'aspirin', 'warfarin', 'insulin', 'amlodipine', 'furosemide'];
  for (const drug of drugs) {
    if (lower.includes(drug)) return { type: 'explain-drug', param: 'drug', value: drug };
  }

  // Lab test explanations
  const labs = ['hba1c', 'creatinine', 'cholesterol', 'egfr', 'troponin', 'glucose', 'alt', 'ast'];
  for (const lab of labs) {
    if (lower.includes(lab)) return { type: 'explain-lab', param: 'test', value: lab };
  }

  // Medical term explanations
  const terms = ['ischemic', 'edema', 'arrhythmia', 'systolic', 'diastolic', 'bmi', 'tachycardia', 'bradycardia', 'atherosclerosis', 'shap', 'comorbidity'];
  for (const term of terms) {
    if (lower.includes(term)) return { type: 'explain-term', param: 'term', value: term };
  }

  // "What is X" / "Explain X" patterns
  const whatIsMatch = lower.match(/(?:what is|what are|explain|tell me about|describe)\s+(.+?)(?:\?|$)/);
  if (whatIsMatch) {
    const subject = whatIsMatch[1].trim();
    // Try disease first
    if (lower.includes('disease') || lower.includes('syndrome') || lower.includes('disorder')) {
      return { type: 'explain-disease', param: 'disease', value: subject };
    }
    return { type: 'explain-term', param: 'term', value: subject };
  }

  return { type: 'general', param: null, value: text };
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function DiseaseCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  if (!data?.explanation) return null;

  const { explanation, disease } = data;
  const sections = [
    { key: 'what',       label: 'What is it?',    icon: '❓' },
    { key: 'causes',     label: 'Causes',          icon: '🔍' },
    { key: 'symptoms',   label: 'Symptoms',        icon: '🤒' },
    { key: 'management', label: 'Management',      icon: '💊' },
    { key: 'prevention', label: 'Prevention',      icon: '🛡️' },
    { key: 'whenToSeek', label: 'When to See a Doctor', icon: '🏥' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🩺</span>
        <span className="text-base font-bold text-white">{disease}</span>
      </div>
      {sections.slice(0, expanded ? 6 : 2).map(({ key, label, icon }) =>
        explanation[key] ? (
          <div key={key} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs font-semibold text-cyan-400 mb-1">{icon} {label}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{explanation[key]}</p>
          </div>
        ) : null
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
      >
        {expanded ? 'Show less' : 'Show more details →'}
      </button>
      {data.disclaimer && (
        <p className="text-[10px] text-slate-500 italic">{data.disclaimer}</p>
      )}
    </div>
  );
}

function DrugCard({ data }) {
  if (!data?.information) return null;
  const info = data.information;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">💊</span>
        <span className="text-base font-bold text-white">{data.drug}</span>
        <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2 py-0.5">{info.class}</span>
      </div>
      {[
        { key: 'how_it_works',       label: 'How it works',       icon: '⚙️' },
        { key: 'common_uses',        label: 'Common uses',        icon: '🎯' },
        { key: 'key_side_effects',   label: 'Key side effects',   icon: '⚠️' },
        { key: 'important_notes',    label: 'Important notes',    icon: '📌' },
      ].map(({ key, label, icon }) =>
        info[key] ? (
          <div key={key} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs font-semibold text-cyan-400 mb-1">{icon} {label}</div>
            <p className="text-xs text-slate-300">{info[key]}</p>
          </div>
        ) : null
      )}
      <p className="text-[10px] text-slate-500 italic">{data.disclaimer}</p>
    </div>
  );
}

function LabCard({ data }) {
  if (!data?.information) return null;
  const info = data.information;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧪</span>
        <span className="text-base font-bold text-white">{info.full_name || data.test}</span>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs font-semibold text-cyan-400 mb-1">❓ What is it?</div>
        <p className="text-xs text-slate-300">{info.what}</p>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs font-semibold text-green-400 mb-1">✅ Normal Range</div>
        <p className="text-xs text-slate-300">{info.normal}</p>
      </div>
      {info.high_means && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xs font-semibold text-orange-400 mb-1">📈 If elevated</div>
          <p className="text-xs text-slate-300">{info.high_means}</p>
        </div>
      )}
      {data.yourValue && data.interpretation && (
        <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
          <div className="text-xs font-semibold text-cyan-400 mb-1">Your Value: {data.yourValue}</div>
          <p className="text-xs text-slate-300">{data.interpretation}</p>
        </div>
      )}
      <p className="text-[10px] text-slate-500 italic">{data.disclaimer}</p>
    </div>
  );
}

function TermCard({ data }) {
  if (!data?.explanation) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">📖</span>
        <span className="text-base font-bold text-white capitalize">{data.term}</span>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <p className="text-xs text-slate-300 leading-relaxed">{data.explanation}</p>
      </div>
      {data.disclaimer && (
        <p className="text-[10px] text-slate-500 italic">{data.disclaimer}</p>
      )}
    </div>
  );
}

function GeneralResponse({ text }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isUser ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`text-[10px] font-semibold ${isUser ? 'text-right text-cyan-400' : 'text-purple-400'}`}>
          {isUser ? 'You' : 'MediChain AI'}
        </div>

        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-slate-200'
            : 'bg-slate-800/70 border border-slate-700/50 text-slate-200'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : message.loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400">Thinking…</span>
            </div>
          ) : message.error ? (
            <div className="flex items-center gap-2 text-red-400">
              <span>⚠️</span>
              <p className="text-xs">{message.error}</p>
            </div>
          ) : (
            <div>
              {message.type === 'explain-disease' && <DiseaseCard data={message.data} />}
              {message.type === 'explain-drug'    && <DrugCard    data={message.data} />}
              {message.type === 'explain-lab'     && <LabCard     data={message.data} />}
              {message.type === 'explain-term'    && <TermCard    data={message.data} />}
              {message.type === 'general'         && <GeneralResponse text={message.text} />}
              {!message.type                      && <p className="text-sm">{message.content}</p>}
            </div>
          )}
        </div>

        <div className="text-[9px] text-slate-600">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AIHealthAssistantPage() {
  const [messages,  setMessages]  = useState([
    {
      id: 'welcome',
      role: 'assistant',
      type: 'general',
      text: 'Hello! I\'m the MediChain AI Health Assistant. I can explain diseases, medications, medical terms, and lab tests in plain English. Try asking: "What is diabetes?" or "Explain HbA1c test". Remember — I provide educational information only. Always consult a qualified physician for medical advice.',
      timestamp: Date.now(),
    },
  ]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [activeCat, setActiveCat] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const userMsgId = `user_${Date.now()}`;
    const botMsgId  = `bot_${Date.now()}`;

    // Add user message
    setMessages((prev) => [...prev, {
      id:        userMsgId,
      role:      'user',
      content:   userText,
      timestamp: Date.now(),
    }]);

    // Add loading bot message
    setMessages((prev) => [...prev, {
      id:        botMsgId,
      role:      'assistant',
      loading:   true,
      timestamp: Date.now(),
    }]);

    setLoading(true);

    try {
      const intent = detectIntent(userText);
      let response;
      let msgType = intent.type;
      let msgData = null;
      let msgText = null;

      switch (intent.type) {
        case 'explain-disease':
          response = await api.post('/ai/assistant/explain-disease', { disease: intent.value });
          msgData  = response.data;
          break;
        case 'explain-drug':
          response = await api.post('/ai/assistant/explain-drug', { drug: intent.value });
          msgData  = response.data;
          break;
        case 'explain-lab':
          response = await api.post('/ai/assistant/explain-lab', { test: intent.value });
          msgData  = response.data;
          break;
        case 'explain-term':
          response = await api.post('/ai/assistant/explain-term', { term: intent.value });
          msgData  = response.data;
          break;
        default:
          // Fallback — try term first, then disease
          try {
            response = await api.post('/ai/assistant/explain-term', { term: userText });
            if (response.data?.found) {
              msgType = 'explain-term';
              msgData = response.data;
            } else {
              msgType = 'general';
              msgText = `I couldn't find specific information about "${userText}". Try asking about a specific disease (e.g., "What is hypertension?"), medication (e.g., "Explain metformin"), or medical term (e.g., "What does edema mean?"). For medical advice, please consult your physician.`;
            }
          } catch {
            msgType = 'general';
            msgText = `I apologize, I couldn't process that request. Please try asking about a specific disease, medication, lab test, or medical term.`;
          }
          break;
      }

      // Update bot message with response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, loading: false, type: msgType, data: msgData, text: msgText }
            : m
        )
      );
    } catch (err) {
      const errMsg = err.response?.data?.error || 'I encountered an error. The AI service may be temporarily unavailable. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, loading: false, error: errMsg }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome_new',
      role: 'assistant',
      type: 'general',
      text: 'Chat cleared. How can I help you today?',
      timestamp: Date.now(),
    }]);
  };

  return (
    <div className="min-h-screen bg-medichain-bg-dark flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-900/40 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
              🤖
            </div>
            <div>
              <h1 className="text-base font-bold text-white">MediChain AI Health Assistant</h1>
              <p className="text-[10px] text-slate-400">Ask medical questions in plain English</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Online
            </span>
            <button
              onClick={clearChat}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Clear
            </button>
            <Link
              to="/enterprise-dashboard"
              className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 px-4 py-4 gap-4">
        {/* ── Quick Suggestions ──────────────────────────────────────────────── */}
        <div>
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {SUGGESTION_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCat(i)}
                className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                  activeCat === i
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* Suggestion pills */}
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTION_CATEGORIES[activeCat].suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat Messages ──────────────────────────────────────────────────── */}
        <GlassCard className="flex-1 flex flex-col min-h-0" style={{ minHeight: '400px' }}>
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a medical question… (e.g. 'What is diabetes?')"
                disabled={loading}
                className="flex-1 bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 placeholder:text-slate-500 transition-colors"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-shadow min-w-[48px] flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '↑'}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              ⚕️ Educational information only — not medical advice. Always consult your physician.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
