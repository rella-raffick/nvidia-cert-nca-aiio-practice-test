import { useState, useCallback } from 'react'
import {
  Target, ClipboardList, BookOpen, FileText, ExternalLink,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Check, X, CheckCircle2, XCircle,
  Trophy, TrendingUp, BookMarked, Home as HomeIcon,
  Shuffle, ListOrdered, ArrowLeft, EyeOff,
} from 'lucide-react'
import rawQuestions from './questions.json'

// ── Data helpers ──────────────────────────────────────────────────────────────
function normaliseQ(q) {
  return { ...q, answer: Array.isArray(q.answer) ? q.answer : [q.answer] }
}
const QUESTIONS = rawQuestions.map(normaliseQ)
const LETTERS   = ['A', 'B', 'C', 'D', 'E']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function shuffleOptions(q) { return { ...q, options: shuffle(q.options) } }
function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  return [...a].sort().every((v, i) => v === [...b].sort()[i])
}

// ── Quiz hook ─────────────────────────────────────────────────────────────────
function useQuiz() {
  const [questions, setQuestions] = useState(() => shuffle(QUESTIONS).map(shuffleOptions))
  const [index, setIndex]         = useState(0)
  const [answers, setAnswers]     = useState({})
  const [score, setScore]         = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished]   = useState(false)

  const current   = questions[index]
  const saved     = answers[index] ?? { selected: [], confirmed: false }
  const selected  = saved.selected
  const confirmed = saved.confirmed
  const isMulti   = current?.answer.length > 1
  const isCorrect = confirmed && arraysEqual(selected, current?.answer ?? [])

  const history = questions
    .map((q, i) => answers[i]
      ? { q: q.question, options: q.options, answer: q.answer, reasoning: q.reasoning, links: q.links ?? [], chosen: answers[i].selected, correct: answers[i].correct }
      : null)
    .filter(Boolean)

  const choose = useCallback((opt) => {
    if (saved.confirmed) return
    setAnswers(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        confirmed: false,
        selected: isMulti
          ? (prev[index]?.selected ?? []).includes(opt)
            ? (prev[index]?.selected ?? []).filter(o => o !== opt)
            : [...(prev[index]?.selected ?? []), opt]
          : [opt],
      },
    }))
  }, [index, saved.confirmed, isMulti])

  const confirm = useCallback(() => {
    if (selected.length === 0 || confirmed) return
    const correct = arraysEqual(selected, current.answer)
    if (!answers[index]?.confirmed) {
      setScore(s => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    }
    setAnswers(prev => ({ ...prev, [index]: { ...prev[index], confirmed: true, correct } }))
  }, [selected, confirmed, current, index, answers])

  const next = useCallback(() => {
    if (index + 1 >= questions.length) setFinished(true)
    else setIndex(i => i + 1)
  }, [index, questions.length])

  const prev = useCallback(() => { if (index > 0) setIndex(i => i - 1) }, [index])

  const restart = useCallback((doShuffle = true) => {
    setQuestions((doShuffle ? shuffle(QUESTIONS) : QUESTIONS).map(shuffleOptions))
    setIndex(0); setAnswers({}); setScore({ correct: 0, wrong: 0 }); setFinished(false)
  }, [])

  return { current, index, total: questions.length, selected, confirmed, isCorrect, isMulti, score, finished, history, choose, confirm, next, prev, restart }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, total, color = 'bg-green-500' }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all duration-300`}
        style={{ width: `${Math.round((value / total) * 100)}%` }} />
    </div>
  )
}

// ── Sticky quiz header ────────────────────────────────────────────────────────
function QuizHeader({ label, labelColor, index, total, right, progressColor }) {
  return (
    <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-8 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-widest ${labelColor}`}>{label}</span>
          <span className="text-sm text-gray-500 font-mono">{index + 1} / {total}</span>
        </div>
        <div>{right}</div>
      </div>
      <div className="max-w-4xl mx-auto">
        <ProgressBar value={index} total={total} color={progressColor} />
      </div>
    </div>
  )
}

// ── Score display (right side of header in practice) ─────────────────────────
function ScoreDisplay({ score }) {
  const answered = score.correct + score.wrong
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-4 text-sm font-semibold">
        <span className="flex items-center gap-1 text-green-400"><Check size={14} strokeWidth={3} /> {score.correct}</span>
        <span className="flex items-center gap-1 text-red-400"><X size={14} strokeWidth={3} /> {score.wrong}</span>
      </div>
      {answered > 0 && (
        <span className="text-sm font-bold text-white bg-gray-800 px-2.5 py-0.5 rounded-lg">
          {Math.round((score.correct / answered) * 100)}%
        </span>
      )}
    </div>
  )
}

// ── Question heading with optional multi-select badge ────────────────────────
function QuestionHeading({ question, badgeColor, isMulti, answerCount }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <p className={`text-xs font-semibold tracking-widest uppercase ${badgeColor}`}>NCA-AIIO</p>
        {isMulti && (
          <span className="text-xs font-semibold bg-purple-900/60 border border-purple-700 text-purple-300 px-2 py-0.5 rounded-full">
            Select {answerCount}
          </span>
        )}
      </div>
      <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">{question}</h2>
    </>
  )
}

// ── Single option row ─────────────────────────────────────────────────────────
// style: tailwind border+bg+text string   icon: element   onClick/disabled optional
function OptionRow({ opt, letter, style, icon, onClick, disabled }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex gap-4 items-center px-5 py-4 rounded-xl border text-base transition-all duration-150 ${style}`}
    >
      {icon ?? (
        <span className="shrink-0 w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center text-sm font-bold text-gray-400">
          {letter}
        </span>
      )}
      <span className="leading-snug">{opt}</span>
    </Tag>
  )
}

// ── Docs link pills ───────────────────────────────────────────────────────────
function DocLinks({ links, borderColor = 'border-gray-700' }) {
  if (!links?.length) return null
  return (
    <div className={`flex flex-wrap gap-2 pt-3 border-t ${borderColor}`}>
      {links.map(l => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-blue-400 hover:text-blue-300 transition-colors border border-gray-700">
          <FileText size={11} /> {l.label} <ExternalLink size={10} />
        </a>
      ))}
    </div>
  )
}

// ── Explanation box ───────────────────────────────────────────────────────────
function ExplanationBox({ isCorrect, correctAnswer, reasoning, links, variant = 'feedback' }) {
  const styles = {
    feedback: {
      border: isCorrect ? 'border-green-800' : 'border-red-800',
      bg:     isCorrect ? 'bg-green-950/60'  : 'bg-red-950/60',
      label:  isCorrect ? 'text-green-400'   : 'text-red-400',
      icon:   isCorrect ? <CheckCircle2 size={16} className="inline mr-1.5 -mt-0.5" /> : <XCircle size={16} className="inline mr-1.5 -mt-0.5" />,
      text:   isCorrect ? 'Correct!'         : 'Incorrect',
      divider: 'border-gray-700',
    },
    revise: {
      border: 'border-purple-800', bg: 'bg-purple-950/30',
      label: 'text-purple-400', icon: <BookOpen size={16} className="inline mr-1.5 -mt-0.5" />, text: 'Explanation', divider: 'border-purple-800/50',
    },
    review: {
      border: 'border-yellow-800', bg: 'bg-yellow-950/20',
      label: 'text-yellow-500', icon: <BookOpen size={16} className="inline mr-1.5 -mt-0.5" />, text: 'Explanation', divider: 'border-yellow-800/50',
    },
  }
  const s = styles[variant]
  return (
    <div className={`rounded-xl border p-5 mb-6 ${s.border} ${s.bg}`}>
      <p className={`font-semibold text-base mb-2 ${s.label}`}>{s.icon}{s.text}</p>
      {variant === 'feedback' && !isCorrect && correctAnswer && (
        <p className="text-gray-300 mb-3">
          Correct: <span className="text-green-300 font-medium">{correctAnswer}</span>
        </p>
      )}
      <p className="text-gray-400 italic leading-relaxed mb-3">{reasoning}</p>
      <DocLinks links={links} borderColor={s.divider} />
    </div>
  )
}

// ── Confirm / Next button ─────────────────────────────────────────────────────
function ConfirmBtn({ onConfirm, canConfirm, isMulti, selected, answerCount, accentClass }) {
  return (
    <button onClick={onConfirm} disabled={!canConfirm}
      className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-colors mb-6 ${
        canConfirm ? accentClass : 'bg-gray-800 text-gray-600 cursor-not-allowed'
      }`}>
      {isMulti ? `Confirm ${selected}/${answerCount} selected` : 'Confirm Answer'}
    </button>
  )
}

// ── Prev / Next nav row ───────────────────────────────────────────────────────
function NavRow({ index, total, onPrev, onNext, nextLabel, nextClass = 'bg-violet-600 hover:bg-violet-500', showNext = true }) {
  return (
    <div className="flex gap-3">
      {index > 0 && (
        <button onClick={onPrev}
          className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 text-base transition-colors flex items-center justify-center gap-2">
          <ChevronLeft size={18} /> Prev
        </button>
      )}
      {showNext && (
        <button onClick={onNext} className={`flex-1 py-4 rounded-xl font-semibold text-white text-base transition-colors flex items-center justify-center gap-2 ${nextClass}`}>
          {nextLabel ?? (index + 1 >= total ? 'See Results' : 'Next')}
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}

// ── Score card ────────────────────────────────────────────────────────────────
function ScoreCard({ pct, score, total, modeLabel, modeColor, actions }) {
  const grade = pct >= 90
    ? <span className="flex items-center justify-center gap-2"><Trophy size={22} className="text-yellow-400" /> Pass</span>
    : pct >= 70
    ? <span className="flex items-center justify-center gap-2"><TrendingUp size={22} className="text-orange-400" /> Almost there</span>
    : <span className="flex items-center justify-center gap-2"><BookMarked size={22} className="text-blue-400" /> Keep studying</span>
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center mb-8">
      <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${modeColor}`}>{modeLabel}</p>
      <p className="text-6xl font-bold text-white mb-2">{pct}%</p>
      <p className="text-2xl mb-4">{grade}</p>
      <p className="text-gray-400 text-sm">{score.correct} correct · {score.wrong} wrong · {total} total</p>
      <div className="mt-6 flex gap-3 justify-center flex-wrap">{actions}</div>
    </div>
  )
}

// ── Toggle group ──────────────────────────────────────────────────────────────
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
            value === o.value ? (o.activeClass ?? 'bg-gray-600 text-white shadow') : 'text-gray-400 hover:text-gray-200'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({ total, onPractice, onExam, onRevise }) {
  const [quizMode, setQuizMode] = useState('practice')
  const [order, setOrder]       = useState('shuffled')
  const isPractice  = quizMode === 'practice'
  const modeColor   = isPractice ? 'bg-violet-600 hover:bg-violet-500' : 'bg-yellow-600 hover:bg-yellow-500'
  const cardBorder  = isPractice ? 'border-violet-600/50' : 'border-yellow-600/50'
  const DESCS       = { practice: 'Instant feedback + explanation after each answer.', exam: 'No feedback during the quiz — full review at the end.' }

  function handleStart() {
    const s = order === 'shuffled'
    isPractice ? onPractice(s) : onExam(s)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <div className="inline-block bg-green-900/40 border border-green-800 text-green-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
            NVIDIA Certified
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 leading-tight">NCA-AIIO<br/>Exam Prep</h1>
          <p className="text-gray-500 text-sm">{total} questions · AI Infrastructure & Operations</p>
        </div>

        <div className={`bg-gray-900 border-2 rounded-2xl p-6 mb-4 transition-colors duration-200 ${cardBorder}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Mode</p>
          <ToggleGroup
            value={quizMode} onChange={setQuizMode}
            options={[
              { value: 'practice', label: <span className="flex items-center justify-center gap-1.5"><Target size={14} /> Practice</span>, activeClass: 'bg-violet-600 text-white shadow' },
              { value: 'exam',     label: <span className="flex items-center justify-center gap-1.5"><ClipboardList size={14} /> Exam</span>,     activeClass: 'bg-yellow-600 text-white shadow' },
            ]}
          />
          <p className="text-gray-500 text-sm mt-3 mb-5 h-10 leading-snug">{DESCS[quizMode]}</p>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Order</p>
          <ToggleGroup
            value={order} onChange={setOrder}
            options={[
              { value: 'shuffled', label: <span className="flex items-center justify-center gap-1.5"><Shuffle size={14} /> Shuffled</span> },
              { value: 'ordered',  label: <span className="flex items-center justify-center gap-1.5"><ListOrdered size={14} /> In Order</span> },
            ]}
          />
          <button onClick={handleStart} className={`w-full mt-6 py-3.5 rounded-xl font-bold text-white text-base transition-colors ${modeColor}`}>
            Start
          </button>
        </div>

        <button onClick={onRevise}
          className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-purple-300 hover:border-purple-700 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <BookOpen size={15} /> Revise — browse all answers
        </button>
      </div>
    </div>
  )
}

// ── Option icon helpers ───────────────────────────────────────────────────────
function makeIcon(letter, sel, isMulti, accentBorder, accentBg) {
  if (isMulti) return (
    <span className={`shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold ${sel ? `${accentBorder} ${accentBg} text-white` : 'border-gray-600 text-gray-400'}`}>
      {sel ? <Check size={15} strokeWidth={3} /> : letter}
    </span>
  )
  return (
    <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${sel ? `${accentBorder} ${accentBg} text-white` : 'border-gray-600 text-gray-400'}`}>
      {letter}
    </span>
  )
}

// ── Practice card ─────────────────────────────────────────────────────────────
function PracticeCard({ q, index, total, score, selected, confirmed, isCorrect, isMulti, choose, confirm, next, prev }) {
  function optStyle(opt) {
    const sel = selected.includes(opt), ans = q.answer.includes(opt)
    if (!confirmed) return sel ? 'border-blue-500 bg-blue-950/50 text-blue-200 cursor-pointer' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800 cursor-pointer'
    if (ans) return 'border-green-500 bg-green-950 text-green-200'
    if (sel) return 'border-red-500 bg-red-950 text-red-200'
    return 'border-gray-800 bg-gray-900 opacity-40 cursor-default'
  }

  const canConfirm = selected.length > 0 && (!isMulti || selected.length === q.answer.length)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <QuizHeader label="Practice" labelColor="text-violet-400" index={index} total={total}
        right={<ScoreDisplay score={score} />} progressColor="bg-violet-500" />

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <QuestionHeading question={q.question} badgeColor="text-violet-600" isMulti={isMulti} answerCount={q.answer.length} />

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => (
              <OptionRow key={opt} opt={opt} letter={LETTERS[i]}
                style={optStyle(opt)}
                icon={makeIcon(LETTERS[i], selected.includes(opt), isMulti, 'border-blue-500', 'bg-blue-600')}
                onClick={() => choose(opt)} disabled={confirmed} />
            ))}
          </div>

          {!confirmed && (
            <ConfirmBtn onConfirm={confirm} canConfirm={canConfirm} isMulti={isMulti}
              selected={selected.length} answerCount={q.answer.length} accentClass="bg-blue-600 hover:bg-blue-500" />
          )}

          {confirmed && (
            <ExplanationBox variant="feedback" isCorrect={isCorrect}
              correctAnswer={q.answer.join(', ')} reasoning={q.reasoning} links={q.links} />
          )}

          <NavRow index={index} total={total} onPrev={prev} onNext={next}
            nextClass="bg-violet-600 hover:bg-violet-500" showNext={confirmed} />
        </div>
      </div>
    </div>
  )
}

// ── Exam card ─────────────────────────────────────────────────────────────────
function ExamCard({ q, index, total, selected, confirmed, isMulti, choose, confirm, next }) {
  function optStyle(opt) {
    const sel = selected.includes(opt)
    if (!confirmed) return sel ? 'border-yellow-500 bg-yellow-950/40 text-yellow-200 cursor-pointer' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800 cursor-pointer'
    return sel ? 'border-yellow-500 bg-yellow-950/40 text-yellow-200 cursor-default' : 'border-gray-800 bg-gray-900 opacity-40 cursor-default'
  }

  const canConfirm = selected.length > 0 && (!isMulti || selected.length === q.answer.length)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <QuizHeader label="Exam" labelColor="text-yellow-500" index={index} total={total}
        right={<span className="flex items-center gap-1.5 text-xs text-gray-600"><EyeOff size={13} /> No feedback until end</span>}
        progressColor="bg-yellow-500" />

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <QuestionHeading question={q.question} badgeColor="text-yellow-600" isMulti={isMulti} answerCount={q.answer.length} />

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => (
              <OptionRow key={opt} opt={opt} letter={LETTERS[i]}
                style={optStyle(opt)}
                icon={makeIcon(LETTERS[i], selected.includes(opt), isMulti, 'border-yellow-500', 'bg-yellow-600')}
                onClick={() => choose(opt)} disabled={confirmed} />
            ))}
          </div>

          {!confirmed
            ? <ConfirmBtn onConfirm={confirm} canConfirm={canConfirm} isMulti={isMulti}
                selected={selected.length} answerCount={q.answer.length} accentClass="bg-yellow-600 hover:bg-yellow-500" />
            : <NavRow index={index} total={total} onPrev={null} onNext={next}
                nextClass="bg-yellow-600 hover:bg-yellow-500" showNext={true} />
          }
        </div>
      </div>
    </div>
  )
}

// ── Revise mode ───────────────────────────────────────────────────────────────
function ReviseMode({ onBack }) {
  const [index, setIndex] = useState(0)
  const q     = QUESTIONS[index]
  const total = QUESTIONS.length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <QuizHeader label="Revise" labelColor="text-purple-400" index={index} total={total}
        right={<button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"><ArrowLeft size={15} /> Back</button>}
        progressColor="bg-purple-500" />

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <QuestionHeading question={q.question} badgeColor="text-purple-500" isMulti={q.answer.length > 1} answerCount={q.answer.length} />

          <div className="flex flex-col gap-4 mb-8">
            {q.options.map((opt, i) => {
              const isAns = q.answer.includes(opt)
              return (
                <OptionRow key={opt} opt={opt} letter={LETTERS[i]}
                  style={isAns ? 'border-green-500 bg-green-950 text-green-200' : 'border-gray-800 bg-gray-900 text-gray-500 opacity-50'}
                  icon={
                    <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${isAns ? 'border-green-500 bg-green-600 text-white' : 'border-gray-600 text-gray-500'}`}>
                      {isAns ? <Check size={15} strokeWidth={3} /> : LETTERS[i]}
                    </span>
                  }
                />
              )
            })}
          </div>

          <ExplanationBox variant="revise" reasoning={q.reasoning} links={q.links} />

          <NavRow index={index} total={total}
            onPrev={() => setIndex(i => i - 1)}
            onNext={() => index + 1 < total ? setIndex(i => i + 1) : onBack()}
            nextLabel={index + 1 < total ? 'Next' : 'Done'}
            nextClass={index + 1 < total ? 'bg-purple-700 hover:bg-purple-600' : 'bg-green-600 hover:bg-green-500'}
          />
        </div>
      </div>
    </div>
  )
}

// ── Shared review question view (exam results drill-down) ─────────────────────
function ReviewQuestion({ h, index, total, onPrev, onNext, onBack }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <QuizHeader label="Review" labelColor="text-yellow-500" index={index} total={total}
        right={<button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"><ArrowLeft size={15} /> Results</button>}
        progressColor="bg-yellow-500" />

      <div className="flex-1 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <QuestionHeading question={h.q} badgeColor="text-yellow-600" isMulti={h.answer.length > 1} answerCount={h.answer.length} />

          <div className="flex flex-col gap-4 mb-8">
            {h.options.map((opt, i) => {
              const isAns    = h.answer.includes(opt)
              const isChosen = h.chosen.includes(opt)
              const style = isAns ? 'border-green-500 bg-green-950 text-green-200'
                          : isChosen ? 'border-red-500 bg-red-950 text-red-200'
                          : 'border-gray-800 bg-gray-900 text-gray-500 opacity-40'
              return (
                <OptionRow key={opt} opt={opt} letter={LETTERS[i]} style={style}
                  icon={
                    <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      isAns ? 'border-green-500 bg-green-600 text-white' : isChosen ? 'border-red-500 bg-red-600 text-white' : 'border-gray-600 text-gray-500'
                    }`}>
                      {isAns ? <Check size={15} strokeWidth={3} /> : isChosen ? <X size={15} strokeWidth={3} /> : LETTERS[i]}
                    </span>
                  }
                />
              )
            })}
          </div>

          <ExplanationBox variant="review" reasoning={h.reasoning} links={h.links} />

          <NavRow index={index} total={total} onPrev={onPrev} onNext={onNext}
            nextLabel={index + 1 >= total ? 'Done' : 'Next'}
            nextClass={index + 1 >= total ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}
          />
        </div>
      </div>
    </div>
  )
}

// ── Exam results ──────────────────────────────────────────────────────────────
function ExamResults({ score, total, history, onHome }) {
  const [reviewIndex, setReviewIndex] = useState(null)
  const pct = Math.round((score.correct / total) * 100)

  if (reviewIndex !== null) {
    return (
      <ReviewQuestion
        h={history[reviewIndex]} index={reviewIndex} total={history.length}
        onPrev={() => setReviewIndex(i => i - 1)}
        onNext={() => reviewIndex + 1 < history.length ? setReviewIndex(i => i + 1) : setReviewIndex(null)}
        onBack={() => setReviewIndex(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <ScoreCard pct={pct} score={score} total={total} modeLabel="Exam Results" modeColor="text-yellow-500"
          actions={<>
            <button onClick={onHome} className="flex items-center gap-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"><HomeIcon size={15} /> Home</button>
            <button onClick={() => setReviewIndex(0)} className="flex items-center gap-2 px-5 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-colors">Review All <ChevronRight size={15} /></button>
          </>}
        />
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Questions</h2>
        <div className="flex flex-col gap-2">
          {history.map((h, i) => (
            <button key={i} onClick={() => setReviewIndex(i)}
              className={`w-full text-left px-5 py-4 flex items-center gap-3 rounded-xl border bg-gray-900 hover:bg-gray-800 transition-colors ${h.correct ? 'border-green-800' : 'border-red-800'}`}>
              {h.correct ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : <XCircle size={16} className="shrink-0 text-red-500" />}
              <span className="text-gray-200 leading-snug text-sm">{h.q}</span>
              <ChevronRight size={15} className="shrink-0 ml-auto text-gray-600" />
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <ScoreCard pct={pct} score={score} total={total} modeLabel="Practice Results" modeColor="text-violet-400"
          actions={<button onClick={onHome} className="flex items-center gap-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"><HomeIcon size={15} /> Home</button>}
        />
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Review</h2>
        <div className="flex flex-col gap-2">
          {history.map((h, i) => {
            const open = expanded === i
            return (
              <div key={i} className={`border rounded-xl overflow-hidden ${h.correct ? 'border-green-800' : 'border-red-800'}`}>
                <button onClick={() => setExpanded(open ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center gap-3 bg-gray-900 hover:bg-gray-800 transition-colors">
                  {h.correct ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : <XCircle size={16} className="shrink-0 text-red-500" />}
                  <span className="text-gray-200 leading-snug text-sm">{h.q}</span>
                  {open ? <ChevronUp size={15} className="shrink-0 ml-auto text-gray-600" /> : <ChevronDown size={15} className="shrink-0 ml-auto text-gray-600" />}
                </button>
                {open && (
                  <div className="px-5 py-4 bg-gray-950 border-t border-gray-800 text-sm space-y-2">
                    {!h.correct && <p className="text-red-400">Your answer: <span className="text-red-300">{h.chosen.join(', ')}</span></p>}
                    <p className="text-green-400">Correct: <span className="text-green-300">{h.answer.join(', ')}</span></p>
                    <p className="text-gray-500 italic leading-relaxed mb-2">{h.reasoning}</p>
                    <DocLinks links={h.links} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('home')
  const [mode, setMode]     = useState('practice')
  const quiz = useQuiz()

  const goResults = () => setScreen(mode === 'exam' ? 'exam-results' : 'practice-results')

  function handleNext() {
    const isLast = quiz.index + 1 >= quiz.total
    quiz.next()
    if (isLast) goResults()
  }

  if (screen === 'revise')           return <ReviseMode onBack={() => setScreen('home')} />
  if (screen === 'home')             return <Home total={QUESTIONS.length} onPractice={s => { quiz.restart(s); setMode('practice'); setScreen('practice') }} onExam={s => { quiz.restart(s); setMode('exam'); setScreen('exam') }} onRevise={() => setScreen('revise')} />
  if (screen === 'practice-results') return <PracticeResults score={quiz.score} total={quiz.total} history={quiz.history} onHome={() => setScreen('home')} />
  if (screen === 'exam-results')     return <ExamResults     score={quiz.score} total={quiz.total} history={quiz.history} onHome={() => setScreen('home')} />

  if (screen === 'practice') return (
    <PracticeCard q={quiz.current} index={quiz.index} total={quiz.total} score={quiz.score}
      selected={quiz.selected} confirmed={quiz.confirmed} isCorrect={quiz.isCorrect} isMulti={quiz.isMulti}
      choose={quiz.choose} confirm={quiz.confirm} next={handleNext} prev={quiz.prev} />
  )

  return (
    <ExamCard q={quiz.current} index={quiz.index} total={quiz.total}
      selected={quiz.selected} confirmed={quiz.confirmed} isMulti={quiz.isMulti}
      choose={quiz.choose} confirm={quiz.confirm} next={handleNext} />
  )
}
