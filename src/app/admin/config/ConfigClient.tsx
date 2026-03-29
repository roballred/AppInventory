'use client'

import { useState } from 'react'
import type { BusinessRule } from '@/lib/db/schema'

// ── Metadata for each key ────────────────────────────────────────────────────

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
    label: 'Certification Deadline — Month',
    unit: '(1–12)',
    description: 'Month of the annual certification deadline. 1 = January, 9 = September, 12 = December.',
    min: 1,
    max: 12,
  },
  certification_deadline_day: {
    label: 'Certification Deadline — Day',
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

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

const SECTIONS: { title: string; description: string; keys: string[] }[] = [
  {
    title: 'Staleness Thresholds',
    description: 'Control when records are flagged as stale. Applies to all agencies.',
    keys: ['staleness_warning_days', 'staleness_critical_days'],
  },
  {
    title: 'Certification Settings',
    description: 'Annual certification deadline and reminder timing.',
    keys: ['certification_deadline_month', 'certification_deadline_day', 'certification_reminder_days'],
  },
]

interface ConfigClientProps {
  initialRules: BusinessRule[]
}

function formatUpdated(rule: BusinessRule): string {
  if (!rule.updatedAt) return 'Never updated'
  const d = new Date(rule.updatedAt)
  const by = rule.updatedById ? ` by ${rule.updatedById}` : ''
  return `Last updated ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}${by}`
}

function displayValue(key: string, rawValue: string): string {
  const n = parseInt(rawValue, 10)
  if (key === 'certification_deadline_month') {
    return `${MONTH_NAMES[n] ?? rawValue} (${rawValue})`
  }
  return rawValue
}

export default function ConfigClient({ initialRules }: ConfigClientProps) {
  const [rules, setRules] = useState<BusinessRule[]>(initialRules)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const ruleMap = new Map(rules.map((r) => [r.key, r]))

  function startEdit(rule: BusinessRule) {
    setEditing(rule.key)
    setDraftValue(rule.value)
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
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: draftValue }),
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

  return (
    <div className="space-y-8">
      {/* Impact warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3">
        <span className="text-amber-500 text-lg leading-tight">⚠️</span>
        <p className="text-sm text-amber-800">
          Changes to staleness thresholds take effect immediately and affect all agency work queues, risk dashboards, and certification eligibility. Coordinate changes with agency administrators before applying.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">{section.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
          </div>

          {/* Settings rows */}
          <ul className="divide-y divide-gray-100">
            {section.keys.map((key) => {
              const rule = ruleMap.get(key)
              if (!rule) return null
              const meta = RULE_META[key]
              const isEditing = editing === key
              const justSaved = savedKey === key

              return (
                <li key={key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: label + value + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{meta?.label ?? key}</span>
                        <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {key}
                        </span>
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
                              {displayValue(key, rule.value)}
                            </span>
                            <span className="text-xs text-gray-500">{meta?.unit}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{meta?.description}</p>
                          {meta?.hint && (
                            <p className="text-xs text-blue-600 mt-0.5">{meta.hint}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatUpdated(rule)}</p>
                        </>
                      )}

                      {isEditing && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={draftValue}
                              onChange={(e) => {
                                setDraftValue(e.target.value)
                                setSaveError(null)
                              }}
                              min={meta?.min ?? 1}
                              max={meta?.max}
                              className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(key)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                            />
                            <span className="text-xs text-gray-500">{meta?.unit}</span>
                          </div>
                          {saveError && (
                            <p className="text-xs text-red-600">{saveError}</p>
                          )}
                          {meta?.hint && (
                            <p className="text-xs text-blue-600">{meta.hint}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveEdit(key)}
                              disabled={saving || draftValue === rule.value}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <span className="text-xs text-gray-400">Press Enter to save, Esc to cancel</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: edit button */}
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(rule)}
                        className="flex-shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {/* Derived preview */}
      <DerivedPreview rules={rules} />
    </div>
  )
}

// ── Derived preview — shows what the current settings mean in plain language ──

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
            Reminder notifications are sent <span className="font-semibold">{reminderDays} days</span> before
            the deadline (<span className="font-semibold">
              {MONTH_NAMES[month < 1 ? 1 : month > 12 ? 12 : month]} {Math.max(1, day - reminderDays) > 0 ? '' : ''}
              ~{reminderDays} days before {deadlineStr}
            </span>).
          </span>
        </div>
      </div>
    </div>
  )
}
