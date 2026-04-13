import { useState, useCallback } from 'react'
import rawQuestions from './questions.json'

function normaliseQ(q) {
  const answer = Array.isArray(q.answer) ? q.answer : [q.answer]
  return { ...q, answer }
}

const QUESTIONS = rawQuestions.map(normaliseQ)
const LETTERS = ['A', 'B', 'C', 'D', 'E']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleOptions(q) {
  return { ...q, options: shuffle(q.options) }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  return [...a].sort().every((v, i) => v === [...b].sort()[i])
}

// ── Shared quiz hook ──────────────────────────────────────────────────────────
// answers: { [index]: { selected: string[], confirmed: bool, correct: bool } }
function useQuiz() {
  const [questions, setQuestions] = useState(() => shuffle(QUESTIONS).map(shuffleOptions))
  const [index, setIndex]         = useState(0)
  const [answers, setAnswers]     = useState({})  // per-question saved state
  const [score, setScore]         = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished]   = useState(false)

  const current   = questions[index]
  const saved     = answers[index] ?? { selected: [], confirmed: false }
  const selected  = saved.selected
  const confirmed = saved.confirmed
  const isMulti   = current?.answer.length > 1
  const isCorrect = confirmed && arraysEqual(selected, current?.answer ?? [])

  // Build history in question order for results screen
  const history = questions
    .map((q, i) => answers[i] ? { q: q.question, options: q.options, answer: q.answer, reasoning: q.reasoning, chosen: answers[i].selected, correct: answers[i].correct } : null)
    .filter(Boolean)

  const choose = useCallback((opt) => {
    if (saved.confirmed) return
    setAnswers(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        selected: isMulti
          ? (prev[index]?.selected ?? []).includes(opt)
            ? (prev[index]?.selected ?? []).filter(o => o !== opt)
            : [...(prev[index]?.selected ?? []), opt]
          : [opt],
        confirmed: false,
      }
    }))
  }, [index, saved.confirmed, isMulti])

  const confirm = useCallback(() => {
    if (selected.length === 0 || confirmed) return
    const correct = arraysEqual(selected, current.answer)
    // Only count score once per question
    if (!answers[index]?.confirmed) {
      setScore(s => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    }
    setAnswers(prev => ({ ...prev, [index]: { ...prev[index], confirmed: true, correct } }))
  }, [selected, confirmed, current, index, answers])

  const goTo = useCallback((i) => {
    setIndex(i)
  }, [])

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
    }
  }, [index, questions.length])

  const prev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1)
  }, [index])

  const restart = useCallback((doShuffle = true) => {
    setQuestions((doShuffle ? shuffle(QUESTIONS) : QUESTIONS).map(shuffleOptions))
    setIndex(0)
    setAnswers({})
    setScore({ correct: 0, wrong: 0 })
    setFinished(false)
  }, [])

  return { current, index, total: questions.length, selected, confirmed, isCorrect, isMulti, score, finished, history, answers, choose, confirm, next, prev, goTo, restart }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, total, color = 'bg-green-500' }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${Math.round((value / total) * 100)}%` }} />
    </div>
  )
}

// ── Option button — shared across modes ───────────────────────────────────────
function Option({ opt, style, icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex gap-4 items-center px-5 py-4 rounded-xl border text-base transition-all duration-150 ${style}`}
    >
      {icon}
      <span className="leading-snug">{opt}</span>
    </button>
  )
}

// ── Toggle group ──────────────────────────────────────────────────────────────
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
            value === o.value
              ? (o.activeClass ?? 'bg-gray-600 text-white shadow')
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Home screen ───────────────────────────────────────────────────────────────
function Home({ total, onPractice, onExam, onRevise }) {
  const [quizMode, setQuizMode] = useState('practice')   // 'practice' | 'exam'
  const [order, setOrder]       = useState('shuffled')   // 'shuffled' | 'ordered'

  function handleStart() {
    const doShuffle = order === 'shuffled'
    quizMode === 'practice' ? onPractice(doShuffle) : onExam(doShuffle)
  }

  const isPractice = quizMode === 'practice'
  const modeColor  = isPractice ? 'bg-violet-600 hover:bg-violet-500' : 'bg-yellow-600 hover:bg-yellow-500'
  const cardBorder = isPractice ? 'border-violet-600/50' : 'border-yellow-600/50'

  const DESCS = {
    practice: 'Instant feedback + explanation after each answer.',
    exam:     'No feedback during the quiz — full review at the end.',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-green-900/40 border border-green-800 text-green-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
            NVIDIA Certified
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 leading-tight">NCA-AIIO<br/>Exam Prep</h1>
          <p className="text-gray-500 text-sm">{total} questions · AI Infrastructure & Operations</p>
        </div>

        {/* Main card — border colour tracks selected mode */}
        <div className={`bg-gray-900 border-2 rounded-2xl p-6 mb-4 transition-colors duration-200 ${cardBorder}`}>
          {/* Mode toggle */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Mode</p>
          <ToggleGroup
            options={[
              { value: 'practice', label: '🎯 Practice', activeClass: 'bg-violet-600 text-white shadow' },
              { value: 'exam',     label: '📋 Exam',     activeClass: 'bg-yellow-600 text-white shadow' },
            ]}
            value={quizMode}
            onChange={setQuizMode}
          />
          {/* Fixed-height desc so the card doesn't jump */}
          <p className="text-gray-500 text-sm mt-3 mb-5 h-10 leading-snug">{DESCS[quizMode]}</p>

          {/* Order toggle */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Order</p>
          <ToggleGroup
            options={[{ value: 'shuffled', label: '🔀 Shuffled' }, { value: 'ordered', label: '📑 In Order' }]}
            value={order}
            onChange={setOrder}
          />

          {/* Start */}
          <button
            onClick={handleStart}
            className={`w-full mt-6 py-3.5 rounded-xl font-bold text-white text-base transition-colors ${modeColor}`}
          >
            Start
          </button>
        </div>

        {/* Revise */}
        <button
          onClick={onRevise}
          className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-purple-300 hover:border-purple-700 text-sm font-medium transition-colors"
        >
          📖 Revise — browse all answers
        </button>
      </div>
    </div>
  )
}

// ── Practice card ─────────────────────────────────────────────────────────────
function PracticeCard({ q, index, total, score, selected, confirmed, isCorrect, isMulti, choose, confirm, next, prev }) {
  function optStyle(opt) {
    const sel = selected.includes(opt)
    const ans = q.answer.includes(opt)
    if (!confirmed) return sel ? 'border-blue-500 bg-blue-950/50 text-blue-200 cursor-pointer' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800 cursor-pointer'
    if (ans) return 'border-green-500 bg-green-950 text-green-200'
    if (sel) return 'border-red-500 bg-red-950 text-red-200'
    return 'border-gray-800 bg-gray-900 opacity-40 cursor-default'
  }

  function optIcon(opt, i) {
    const sel = selected.includes(opt)
    if (isMulti) return (
      <span className={`shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold ${sel ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-600 text-gray-400'}`}>
        {sel ? '✓' : LETTERS[i]}
      </span>
    )
    return (
      <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${sel ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-600 text-gray-400'}`}>
        {LETTERS[i]}
      </span>
    )
  }

  const canConfirm = selected.length > 0 && (!isMulti || selected.length === q.answer.length)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Practice</span>
            <span className="text-sm text-gray-500 font-mono">{index + 1} / {total}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm font-semibold">
              <span className="text-green-400">✓ {score.correct}</span>
              <span className="text-red-400">✗ {score.wrong}</span>
            </div>
            {(score.correct + score.wrong) > 0 && (
              <span className="text-sm font-bold text-white bg-gray-800 px-2.5 py-0.5 rounded-lg">
                {Math.round((score.correct / (score.correct + score.wrong)) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto"><ProgressBar value={index} total={total} /></div>
      </div>

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <p className="text-xs font-semibold tracking-widest text-green-600 uppercase">NCA-AIIO</p>
            {isMulti && <span className="text-xs font-semibold bg-purple-900/60 border border-purple-700 text-purple-300 px-2 py-0.5 rounded-full">Select {q.answer.length}</span>}
          </div>
          <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">{q.question}</h2>

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => (
              <Option key={opt} opt={opt} style={optStyle(opt)} icon={optIcon(opt, i)} onClick={() => choose(opt)} disabled={confirmed} />
            ))}
          </div>

          {!confirmed && (
            <button onClick={confirm} disabled={!canConfirm}
              className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-colors mb-6 ${canConfirm ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
              {isMulti ? `Confirm ${selected.length}/${q.answer.length} selected` : 'Confirm Answer'}
            </button>
          )}

          {confirmed && (
            <div className={`rounded-xl border p-5 mb-6 ${isCorrect ? 'border-green-800 bg-green-950/60' : 'border-red-800 bg-red-950/60'}`}>
              <p className={`font-semibold text-base mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </p>
              {!isCorrect && <p className="text-gray-300 mb-3">Correct: <span className="text-green-300 font-medium">{q.answer.join(', ')}</span></p>}
              <p className="text-gray-400 italic leading-relaxed">{q.reasoning}</p>
            </div>
          )}

          {/* Nav — prev always visible once past q1, next only after confirming */}
          <div className="flex gap-3">
            {index > 0 && (
              <button onClick={prev} className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 text-base transition-colors">
                ← Prev
              </button>
            )}
            {confirmed && (
              <button onClick={next} className="flex-1 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-white text-base transition-colors">
                {index + 1 >= total ? 'See Results →' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Exam card — no feedback, just select + confirm + next ─────────────────────
function ExamCard({ q, index, total, selected, confirmed, isMulti, choose, confirm, next }) {
  function optStyle(opt) {
    const sel = selected.includes(opt)
    if (!confirmed) return sel ? 'border-yellow-500 bg-yellow-950/40 text-yellow-200 cursor-pointer' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800 cursor-pointer'
    return sel ? 'border-yellow-500 bg-yellow-950/40 text-yellow-200 cursor-default' : 'border-gray-800 bg-gray-900 opacity-40 cursor-default'
  }

  function optIcon(opt) {
    const sel = selected.includes(opt)
    if (isMulti) return (
      <span className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${sel ? 'border-yellow-500 bg-yellow-600' : 'border-gray-600'}`}>{sel && '✓'}</span>
    )
    return (
      <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? 'border-yellow-500' : 'border-gray-600'}`}>
        {sel && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
      </span>
    )
  }

  const canConfirm = selected.length > 0 && (!isMulti || selected.length === q.answer.length)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-yellow-500 uppercase tracking-widest">Exam</span>
            <span className="text-sm text-gray-500 font-mono">{index + 1} / {total}</span>
          </div>
          <span className="text-xs text-gray-600">No feedback until the end</span>
        </div>
        <div className="max-w-4xl mx-auto"><ProgressBar value={index} total={total} color="bg-yellow-500" /></div>
      </div>

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <p className="text-xs font-semibold tracking-widest text-yellow-600 uppercase">NCA-AIIO</p>
            {isMulti && <span className="text-xs font-semibold bg-purple-900/60 border border-purple-700 text-purple-300 px-2 py-0.5 rounded-full">Select {q.answer.length}</span>}
          </div>
          <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">{q.question}</h2>

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => (
              <Option key={opt} opt={opt} letter={LETTERS[i]} style={optStyle(opt)} icon={optIcon(opt)} onClick={() => choose(opt)} disabled={confirmed} />
            ))}
          </div>

          {!confirmed ? (
            <button onClick={confirm} disabled={!canConfirm}
              className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-colors ${canConfirm ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
              {isMulti ? `Confirm ${selected.length}/${q.answer.length} selected` : 'Confirm Answer'}
            </button>
          ) : (
            <button onClick={next} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-semibold text-white text-base transition-colors">
              {index + 1 >= total ? 'See Results →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Exam results — revise-style list with your answers shown ──────────────────
function ExamResults({ score, total, history, onHome }) {
  const [reviewIndex, setReviewIndex] = useState(null) // null = score screen, number = reviewing that q
  const pct = Math.round((score.correct / total) * 100)
  const grade = pct >= 90 ? '🎉 Pass' : pct >= 70 ? '😐 Almost there' : '📚 Keep studying'

  if (reviewIndex !== null) {
    const h = history[reviewIndex]
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-mono">{reviewIndex + 1} / {total}</span>
            <button onClick={() => setReviewIndex(null)} className="text-sm text-gray-400 hover:text-white transition-colors">← Back to results</button>
          </div>
          <div className="max-w-4xl mx-auto"><ProgressBar value={reviewIndex} total={total} color="bg-yellow-500" /></div>
        </div>
        <div className="flex-1 px-8 py-10">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold tracking-widest text-yellow-600 uppercase mb-5">NCA-AIIO — Review</p>
            <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">{h.q}</h2>

            <div className="flex flex-col gap-4 mb-8">
              {h.options.map((opt, i) => {
                const isAns = h.answer.includes(opt)
                const isChosen = h.chosen.includes(opt)
                let style = 'border-gray-800 bg-gray-900 text-gray-500 opacity-40'
                if (isAns) style = 'border-green-500 bg-green-950 text-green-200'
                else if (isChosen) style = 'border-red-500 bg-red-950 text-red-200'
                return (
                  <div key={opt} className={`w-full flex gap-4 items-start px-5 py-4 rounded-xl border text-base ${style}`}>
                    <span className="shrink-0 w-6 text-sm font-bold text-gray-500">{LETTERS[i]}</span>
                    <span className="leading-snug">{opt}</span>
                    {isAns && <span className="ml-auto shrink-0 text-green-400 font-bold">✓</span>}
                    {isChosen && !isAns && <span className="ml-auto shrink-0 text-red-400 font-bold">✗</span>}
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-5 mb-6">
              <p className="text-xs font-semibold text-yellow-500 uppercase tracking-widest mb-2">Explanation</p>
              <p className="text-gray-300 leading-relaxed">{h.reasoning}</p>
            </div>

            <div className="flex gap-3">
              {reviewIndex > 0 && (
                <button onClick={() => setReviewIndex(i => i - 1)} className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 text-base transition-colors">← Prev</button>
              )}
              {reviewIndex + 1 < total ? (
                <button onClick={() => setReviewIndex(i => i + 1)} className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-semibold text-white text-base transition-colors">Next →</button>
              ) : (
                <button onClick={() => setReviewIndex(null)} className="flex-1 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-white text-base transition-colors">Done ✓</button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Score */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center mb-8">
          <p className="text-xs font-semibold text-yellow-500 uppercase tracking-widest mb-4">Exam Results</p>
          <p className="text-6xl font-bold text-white mb-2">{pct}%</p>
          <p className="text-2xl mb-4">{grade}</p>
          <p className="text-gray-400 text-sm">{score.correct} correct · {score.wrong} wrong · {total} total</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button onClick={onHome} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">← Home</button>
            <button onClick={() => setReviewIndex(0)} className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-colors">Review All →</button>
          </div>
        </div>

        {/* List */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Questions</h2>
        <div className="flex flex-col gap-2">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setReviewIndex(i)}
              className={`w-full text-left px-5 py-4 flex items-start gap-3 rounded-xl border bg-gray-900 hover:bg-gray-800 transition-colors ${h.correct ? 'border-green-800' : 'border-red-800'}`}
            >
              <span className="shrink-0 mt-0.5">{h.correct ? '✅' : '❌'}</span>
              <span className="text-gray-200 leading-snug text-sm">{h.q}</span>
              <span className="shrink-0 ml-auto text-gray-600 text-xs mt-0.5">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Practice results ──────────────────────────────────────────────────────────
function PracticeResults({ score, total, history, onHome }) {
  const [expanded, setExpanded] = useState(null)
  const pct = Math.round((score.correct / total) * 100)
  const grade = pct >= 90 ? '🎉 Pass' : pct >= 70 ? '😐 Almost there' : '📚 Keep studying'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center mb-8">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-widest mb-4">Practice Results</p>
          <p className="text-6xl font-bold text-white mb-2">{pct}%</p>
          <p className="text-2xl mb-4">{grade}</p>
          <p className="text-gray-400 text-sm">{score.correct} correct · {score.wrong} wrong · {total} total</p>
          <button onClick={onHome} className="mt-6 px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">← Home</button>
        </div>

        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Review</h2>
        <div className="flex flex-col gap-2">
          {history.map((h, i) => {
            const open = expanded === i
            return (
              <div key={i} className={`border rounded-xl overflow-hidden ${h.correct ? 'border-green-800' : 'border-red-800'}`}>
                <button onClick={() => setExpanded(open ? null : i)} className="w-full text-left px-5 py-4 flex items-start gap-3 bg-gray-900 hover:bg-gray-800 transition-colors">
                  <span className="shrink-0 mt-0.5">{h.correct ? '✅' : '❌'}</span>
                  <span className="text-gray-200 leading-snug text-sm">{h.q}</span>
                  <span className="shrink-0 ml-auto text-gray-600 text-xs mt-0.5">{open ? '▲' : '▼'}</span>
                </button>
                {open && (
                  <div className="px-5 py-4 bg-gray-950 border-t border-gray-800 text-sm space-y-2">
                    {!h.correct && <p className="text-red-400">Your answer: <span className="text-red-300">{h.chosen.join(', ')}</span></p>}
                    <p className="text-green-400">Correct: <span className="text-green-300">{h.answer.join(', ')}</span></p>
                    <p className="text-gray-500 italic leading-relaxed">{h.reasoning}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Revise mode ───────────────────────────────────────────────────────────────
function ReviseMode({ onBack }) {
  const [index, setIndex] = useState(0)
  const q = QUESTIONS[index]
  const total = QUESTIONS.length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Revise</span>
            <span className="text-sm text-gray-500 font-mono">{index + 1} / {total}</span>
          </div>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        </div>
        <div className="max-w-4xl mx-auto"><ProgressBar value={index} total={total} color="bg-purple-500" /></div>
      </div>

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-purple-500 uppercase mb-5">NCA-AIIO</p>
          <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">{q.question}</h2>

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => {
              const isAns = q.answer.includes(opt)
              return (
                <div key={opt} className={`w-full flex gap-4 items-start px-5 py-4 rounded-xl border text-base ${isAns ? 'border-green-500 bg-green-950 text-green-200' : 'border-gray-800 bg-gray-900 text-gray-500 opacity-50'}`}>
                  <span className="shrink-0 w-6 text-sm font-bold text-gray-500">{LETTERS[i]}</span>
                  <span className="leading-snug">{opt}</span>
                  {isAns && <span className="ml-auto shrink-0 text-green-500 font-bold">✓</span>}
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-purple-800 bg-purple-950/30 p-5 mb-6">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-2">Explanation</p>
            <p className="text-gray-300 leading-relaxed">{q.reasoning}</p>
          </div>

          <div className="flex gap-3">
            {index > 0 && (
              <button onClick={() => setIndex(i => i - 1)} className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 text-base transition-colors">← Prev</button>
            )}
            {index + 1 < total ? (
              <button onClick={() => setIndex(i => i + 1)} className="flex-1 py-4 bg-purple-700 hover:bg-purple-600 rounded-xl font-semibold text-white text-base transition-colors">Next →</button>
            ) : (
              <button onClick={onBack} className="flex-1 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-white text-base transition-colors">Done ✓</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home') // 'home' | 'practice' | 'exam' | 'practice-results' | 'exam-results' | 'revise'
  const [mode, setMode] = useState('practice') // 'practice' | 'exam'
  const quiz = useQuiz()

  function startPractice(doShuffle) { quiz.restart(doShuffle); setMode('practice'); setScreen('practice') }
  function startExam(doShuffle) { quiz.restart(doShuffle); setMode('exam'); setScreen('exam') }

  if (screen === 'revise') return <ReviseMode onBack={() => setScreen('home')} />

  if (screen === 'home') return (
    <Home total={QUESTIONS.length} onPractice={startPractice} onExam={startExam} onRevise={() => setScreen('revise')} />
  )

  if (screen === 'practice-results') return (
    <PracticeResults score={quiz.score} total={quiz.total} history={quiz.history} onHome={() => setScreen('home')} />
  )

  if (screen === 'exam-results') return (
    <ExamResults score={quiz.score} total={quiz.total} history={quiz.history} onHome={() => setScreen('home')} />
  )

  function handleNext() {
    const isLast = quiz.index + 1 >= quiz.total
    quiz.next()
    if (isLast) setScreen(mode === 'exam' ? 'exam-results' : 'practice-results')
  }

  if (screen === 'exam') return (
    <ExamCard q={quiz.current} index={quiz.index} total={quiz.total} selected={quiz.selected} confirmed={quiz.confirmed} isMulti={quiz.isMulti} choose={quiz.choose} confirm={quiz.confirm} next={handleNext} />
  )

  return (
    <PracticeCard q={quiz.current} index={quiz.index} total={quiz.total} score={quiz.score} selected={quiz.selected} confirmed={quiz.confirmed} isCorrect={quiz.isCorrect} isMulti={quiz.isMulti} choose={quiz.choose} confirm={quiz.confirm} next={handleNext} prev={quiz.prev} />
  )
}
