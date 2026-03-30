'use client'

import { Fragment, useState } from 'react'
import type { BusinessRule } from '@/lib/db/schema'

// ── Constants ─────────────────────────────────────────────────────────────────

const CORE_KEYS = [
  'staleness_warning_days',
  'staleness_critical_days',
  'certification_reminder_days',
  'certification_deadline_month',
  'certification_deadline_day',
] as const
const CORE_KEY_SET = new Set<string>(CORE_KEYS)

// ── Metadata for known keys ───────────────────────────────────────────────────

interface RuleMeta {
  label: string
  unit: string
  description: string
  min: number
  max: number
  hint?: string
}

const RULE_META: Record<string, RuleMeta> = {
  staleness_warning_days: {
    label: 'Warning Threshold',
    unit: 'days',
    description: 'Records not reviewed within this many days appear as warnings in the work queue and risk dashboard.',
    min: 1,
    max: 3650,
    hint: 'Must be less than the critical threshold.',
  },
  staleness_critical_days: {
    label: 'Critical Threshold',
    unit: 'days',
    description: 'Records not reviewed within this many days are critically stale and block certification submission.',
    min: 1,
    max: 3650,
    hint: 'Must be greater than the warning threshold.',
  },
  certification_deadline_month: {
    label: 'Deadline Month',
    unit: '(1–12)',
    description: 'Month of the annual certification deadline. 1 = January, 9 = September, 12 = December.',
    min: 1,
    max: 12,
  },
  certification_deadline_day: {
    label: 'Deadline Day',
    unit: '(1–31)',
    description: 'Day of the month for the annual certification deadline.',
    min: 1,
    max: 31,
  },
  certification_reminder_days: {
    label: 'Reminder Lead Time',
    unit: 'days before deadline',
    description: 'How many days before the certification deadline to send reminder notifications to agency admins.',
    min: 1,
    max: 180,
  },
}

// ── Category helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

const CATEGORY_ORDER = ['staleness', 'certification', 'general']

interface CatStyle { badge: string; headerBg: string }
const CATEGORY_STYLES: Record<string, CatStyle> = {
  staleness:    { badge: 'bg-amber-100 text-amber-700 border border-amber-200',  headerBg: 'bg-amber-50/60'  },
  certification:{ badge: 'bg-blue-100 text-blue-700 border border-blue-200',     headerBg: 'bg-blue-50/60'   },
  general:      { badge: 'bg-gray-100 text-gray-600 border border-gray-200',     headerBg: 'bg-gray-50'      },
}
const FALLBACK_STYLE: CatStyle = { badge: 'bg-purple-100 text-purple-700 border border-purple-200', headerBg: 'bg-purple-50/60' }

function getCatStyle(cat: string | null | undefined): CatStyle {
  return CATEGORY_STYLES[cat ?? 'general'] ?? FALLBACK_STYLE
}

function catLabel(cat: string | null | undefined): string {
  if (!cat || cat === 'general') return 'General'
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')
}

function groupRules(rules: BusinessRule[]): [string, BusinessRule[]][] {
  const map = new Map<string, BusinessRule[]>()
  for (const r of rules) {
    const cat = r.category ?? 'general'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(r)
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
  return keys.map((k) => [k, map.get(k)!])
}

function formatUpdated(rule: BusinessRule): string {
  if (!rule.updatedAt) return ''
  const d = new Date(rule.updatedAt)
  const by = rule.updatedById ? ` by ${rule.updatedById}` : ''
  return `Updated ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}${by}`
}

function displayValue(key: string, rawValue: string): string {
  const n = parseInt(rawValue, 10)
  if (key === 'certification_deadline_month') {
    return `${MONTH_NAMES[n] ?? rawValue} (${rawValue})`
  }
  return rawValue
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConfigClientProps {
  initialRules: BusinessRule[]
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConfigClient({ initialRules }: ConfigClientProps) {
  const [rules, setRules] = useState<BusinessRule[]>(initialRules)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const grouped = groupRules(rules)
  const existingCategories = [...new Set(rules.map((r) => r.category).filter(Boolean) as string[])]

  function startEdit(rule: BusinessRule) {
    setEditing(rule.key)
    setDraftValue(rule.value)
    setDraftCategory(rule.category ?? 'general')
    setSaveError(null)
    setSavedKey(null)
  }

  function cancelEdit() {
    setEditing(null)
    setSaveError(null)
  }

  async function saveEdit(key: string) {
    setSaving(true)
    setSaveError(null)
    const isCore = CORE_KEY_SET.has(key)
    try {
      const body: Record<string, string> = { key, value: draftValue }
      if (!isCore) body.category = draftCategory
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed.')
        return
      }
      setRules((prev) => prev.map((r) => (r.key === key ? data : r)))
      setEditing(null)
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 3000)
    } catch {
      setSaveError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRule(key: string) {
    setDeletingKey(key)
    try {
      const res = await fetch(`/api/admin/config?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Delete failed.')
        return
      }
      setRules((prev) => prev.filter((r) => r.key !== key))
    } catch {
      alert('Network error — please try again.')
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Impact warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3">
        <span className="text-amber-500 text-lg leading-tight">⚠️</span>
        <p className="text-sm text-amber-800">
          Changes take effect immediately and affect all agency work queues, risk dashboards, and certification eligibility. Coordinate changes with agency administrators before applying.
        </p>
      </div>

      {/* Unified rules list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Business Rules</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {rules.length} rule{rules.length !== 1 ? 's' : ''} across {grouped.length} categor{grouped.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <span className="text-base leading-none">+</span> Add Rule
            </button>
          )}
        </div>

        <ul>
          {grouped.map(([cat, catRules], groupIdx) => (
            <Fragment key={cat}>
              {/* Category header row */}
              <li
                className={`px-5 py-2 flex items-center gap-2 border-b border-gray-100 ${getCatStyle(cat).headerBg} ${groupIdx > 0 ? 'border-t border-gray-200' : ''}`}
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getCatStyle(cat).badge}`}>
                  {catLabel(cat)}
                </span>
                <span className="text-xs text-gray-400">
                  {catRules.length} rule{catRules.length !== 1 ? 's' : ''}
                </span>
              </li>

              {/* Rule rows */}
              {catRules.map((rule) => (
                <RuleRow
                  key={rule.key}
                  rule={rule}
                  meta={RULE_META[rule.key]}
                  isCore={CORE_KEY_SET.has(rule.key)}
                  isEditing={editing === rule.key}
                  justSaved={savedKey === rule.key}
                  draftValue={draftValue}
                  draftCategory={draftCategory}
                  saving={saving}
                  saveError={editing === rule.key ? saveError : null}
                  onStartEdit={() => startEdit(rule)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(rule.key)}
                  onDraftChange={(v) => { setDraftValue(v); setSaveError(null) }}
                  onCategoryChange={(v) => setDraftCategory(v)}
                  deleting={deletingKey === rule.key}
                  onDelete={() => deleteRule(rule.key)}
                  existingCategories={existingCategories}
                />
              ))}
            </Fragment>
          ))}
        </ul>

        {rules.length === 0 && !showAddForm && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No rules configured.</div>
        )}

        {showAddForm && (
          <AddRuleForm
            existingCategories={existingCategories}
            onCreated={(newRule) => {
              setRules((prev) => [...prev, newRule])
              setShowAddForm(false)
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>

      {/* Live preview */}
      <DerivedPreview rules={rules} />
    </div>
  )
}

// ── RuleRow ───────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: BusinessRule
  meta: RuleMeta | undefined
  isCore: boolean
  isEditing: boolean
  justSaved: boolean
  draftValue: string
  draftCategory: string
  saving: boolean
  saveError: string | null
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDraftChange: (v: string) => void
  onCategoryChange: (v: string) => void
  deleting?: boolean
  onDelete?: () => void
  existingCategories: string[]
}

function RuleRow({
  rule, meta, isCore, isEditing, justSaved, draftValue, draftCategory,
  saving, saveError, onStartEdit, onCancelEdit, onSaveEdit,
  onDraftChange, onCategoryChange, deleting, onDelete, existingCategories,
}: RuleRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className="px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        {/* Left: label + key + value + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">
              {meta?.label ?? rule.key}
            </span>
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {rule.key}
            </span>
            {isCore && (
              <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
                system
              </span>
            )}
            {justSaved && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                ✓ Saved
              </span>
            )}
          </div>

          {!isEditing && (
            <>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-900">
                  {displayValue(rule.key, rule.value)}
                </span>
                {meta?.unit && <span className="text-xs text-gray-500">{meta.unit}</span>}
              </div>
              {(meta?.description || rule.description) && (
                <p className="text-xs text-gray-500 mt-1">
                  {meta?.description ?? rule.description}
                </p>
              )}
              {meta?.hint && (
                <p className="text-xs text-blue-600 mt-0.5">{meta.hint}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatUpdated(rule)}</p>
            </>
          )}

          {isEditing && (
            <div className="mt-2 space-y-3">
              {/* Value field */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={draftValue}
                  onChange={(e) => onDraftChange(e.target.value)}
                  min={meta?.min ?? 1}
                  max={meta?.max}
                  className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit()
                    if (e.key === 'Escape') onCancelEdit()
                  }}
                />
                {meta?.unit && <span className="text-xs text-gray-500">{meta.unit}</span>}
              </div>

              {/* Category field — custom rules only */}
              {!isCore && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-16 flex-shrink-0">Category</label>
                  <input
                    list="category-suggestions"
                    type="text"
                    value={draftCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    placeholder="e.g. staleness"
                    maxLength={50}
                    className="w-40 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              )}

              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              {meta?.hint && <p className="text-xs text-blue-600">{meta.hint}</p>}

              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={saving || draftValue === rule.value}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <span className="text-xs text-gray-400">Enter to save · Esc to cancel</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: actions */}
        {!isEditing && (
          <div className="flex-shrink-0 flex items-center gap-2 pt-0.5">
            <button
              onClick={onStartEdit}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            {!isCore && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            {!isCore && confirmDelete && (
              <>
                <span className="text-xs text-red-700 font-medium">Delete this rule?</span>
                <button
                  onClick={() => { onDelete?.(); setConfirmDelete(false) }}
                  disabled={deleting}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

// ── AddRuleForm ───────────────────────────────────────────────────────────────

interface AddRuleFormProps {
  existingCategories: string[]
  onCreated: (rule: BusinessRule) => void
  onCancel: () => void
}

function AddRuleForm({ existingCategories, onCreated, onCancel }: AddRuleFormProps) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: key.trim(),
          value: value.trim(),
          description: description.trim(),
          category: category.trim() || 'general',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Create failed.')
        return
      }
      onCreated(data)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-5 border-t border-gray-200 bg-gray-50 space-y-4">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Rule</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(null) }}
            placeholder="e.g. max_vendors_per_app"
            pattern="[a-z][a-z0-9_]*"
            maxLength={100}
            required
            autoFocus
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400">lowercase_snake_case</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Value <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder="e.g. 30"
            min={1}
            max={999999}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400">Positive integer</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Category</label>
          <input
            list="new-category-suggestions"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. general"
            maxLength={50}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <datalist id="new-category-suggestions">
            {existingCategories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <p className="text-xs text-gray-400">Groups rules in the list</p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this rule control?"
          maxLength={500}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !key.trim() || !value.trim()}
          className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Creating…' : 'Create Rule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── DerivedPreview ────────────────────────────────────────────────────────────

function DerivedPreview({ rules }: { rules: BusinessRule[] }) {
  const ruleMap = new Map(rules.map((r) => [r.key, parseInt(r.value, 10)]))

  const warning = ruleMap.get('staleness_warning_days') ?? 90
  const critical = ruleMap.get('staleness_critical_days') ?? 180
  const month = ruleMap.get('certification_deadline_month') ?? 9
  const day = ruleMap.get('certification_deadline_day') ?? 30
  const reminderDays = ruleMap.get('certification_reminder_days') ?? 30

  const monthName = MONTH_NAMES[month] ?? `Month ${month}`
  const deadlineStr = `${monthName} ${day}`
  const warningOk = warning < critical

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Settings Preview</h2>
      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <span className={warningOk ? 'text-green-600' : 'text-red-600'}>●</span>
          <span>
            Records are flagged <span className="font-semibold text-yellow-700">⚠ Warning</span> after{' '}
            <span className="font-semibold">{warning} days</span> without review.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className={warningOk ? 'text-green-600' : 'text-red-600'}>●</span>
          <span>
            Records become <span className="font-semibold text-red-700">🔴 Critical</span> after{' '}
            <span className="font-semibold">{critical} days</span> without review.
          </span>
        </div>
        {!warningOk && (
          <p className="text-red-600 text-xs font-medium">
            ⚠ Warning threshold must be less than critical threshold.
          </p>
        )}
        <div className="flex items-start gap-2">
          <span className="text-green-600">●</span>
          <span>
            Annual certification deadline is <span className="font-semibold">{deadlineStr}</span> each year.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-600">●</span>
          <span>
            Reminder notifications sent <span className="font-semibold">{reminderDays} days</span> before the deadline.
          </span>
        </div>
      </div>
    </div>
  )
}
