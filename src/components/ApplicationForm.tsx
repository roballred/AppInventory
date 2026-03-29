'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Application, LifecycleStatus, BusinessCriticality, CoreBusinessFunction } from '@/lib/db/schema'

const LIFECYCLE_OPTIONS: { value: LifecycleStatus; label: string }[] = [
  { value: 'in_development', label: 'In Development' },
  { value: 'in_production', label: 'In Production' },
  { value: 'retirement_in_progress', label: 'Retirement in Progress' },
  { value: 'retired_from_inventory', label: 'Retired from Inventory' },
]

const BUSINESS_CRITICALITY_OPTIONS: { value: BusinessCriticality; label: string }[] = [
  { value: 'business_essential', label: 'Business Essential' },
  { value: 'historical', label: 'Historical' },
  { value: 'mission_critical', label: 'Mission Critical' },
  { value: 'user_productivity', label: 'User Productivity' },
]

const CORE_BUSINESS_FUNCTION_OPTIONS: { value: CoreBusinessFunction; label: string }[] = [
  { value: 'civil_engagement_and_law', label: 'Civil Engagement & Law' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'communications', label: 'Communications' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'fiscal_and_revenue', label: 'Fiscal & Revenue' },
  { value: 'health_and_human_services', label: 'Health & Human Services' },
  { value: 'health_safety_security_environmental', label: 'Health / Safety / Security / Environmental' },
  { value: 'land_management_and_conservation', label: 'Land Management & Conservation' },
  { value: 'legal', label: 'Legal' },
  { value: 'manufacturing_and_delivery', label: 'Manufacturing & Delivery' },
  { value: 'marketing_and_sales', label: 'Marketing & Sales' },
  { value: 'military', label: 'Military' },
  { value: 'product_management', label: 'Product Management' },
  { value: 'property_and_facility', label: 'Property & Facility' },
  { value: 'public_safety', label: 'Public Safety' },
  { value: 'risk_audit_and_compliance', label: 'Risk / Audit & Compliance' },
  { value: 'transportation_and_infrastructure', label: 'Transportation & Infrastructure' },
  { value: 'vendor_and_procurement', label: 'Vendor & Procurement' },
  { value: 'workforce', label: 'Workforce' },
]

interface ApplicationFormProps {
  application?: Application
  agencyId: string
  onSuccess: (id: string) => void
}

interface FormErrors {
  name?: string
  lifecycleStatus?: string
  version?: string
  manufacturerVendor?: string
  technicalOwner?: string
  inServiceDate?: string
  general?: string
}

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputClass =
  'block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

const checkboxRowClass = 'flex items-center gap-2'

export default function ApplicationForm({
  application,
  agencyId,
  onSuccess,
}: ApplicationFormProps) {
  const router = useRouter()
  const isEditing = !!application

  const [name, setName] = useState(application?.name ?? '')
  const [description, setDescription] = useState(application?.description ?? '')
  const [version, setVersion] = useState(application?.version ?? '')
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus>(
    application?.lifecycleStatus ?? 'in_production'
  )
  const [manufacturerVendor, setManufacturerVendor] = useState(
    application?.manufacturerVendor ?? ''
  )
  const [cloudServiceProvider, setCloudServiceProvider] = useState(
    application?.cloudServiceProvider ?? ''
  )
  const [operatingSystem, setOperatingSystem] = useState(application?.operatingSystem ?? '')
  const [osVersion, setOsVersion] = useState(application?.osVersion ?? '')
  const [contractNumber, setContractNumber] = useState(application?.contractNumber ?? '')
  const [licenseNumber, setLicenseNumber] = useState(application?.licenseNumber ?? '')
  const [technicalOwner, setTechnicalOwner] = useState(application?.technicalOwner ?? '')
  const [technicalOwnerEmail, setTechnicalOwnerEmail] = useState(
    application?.technicalOwnerEmail ?? ''
  )
  const [inServiceDate, setInServiceDate] = useState(application?.inServiceDate ?? '')
  const [retirementDate, setRetirementDate] = useState(application?.retirementDate ?? '')
  const [isUnsupportedVersion, setIsUnsupportedVersion] = useState(
    application?.isUnsupportedVersion ?? false
  )
  const [isUpdatable, setIsUpdatable] = useState(application?.isUpdatable ?? true)
  const [isAgingTechnology, setIsAgingTechnology] = useState(
    application?.isAgingTechnology ?? false
  )
  const [isAiEnabled, setIsAiEnabled] = useState(application?.isAiEnabled ?? false)
  const [isGenerativeAi, setIsGenerativeAi] = useState(application?.isGenerativeAi ?? false)
  const [riskFlagsVerified, setRiskFlagsVerified] = useState(false)
  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality | ''>(
    application?.businessCriticality ?? ''
  )
  const [coreBusinessFunction, setCoreBusinessFunction] = useState<CoreBusinessFunction | ''>(
    application?.coreBusinessFunction ?? ''
  )

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!lifecycleStatus) newErrors.lifecycleStatus = 'Lifecycle status is required'
    if (!version.trim()) newErrors.version = 'Version is required'
    if (!manufacturerVendor.trim()) newErrors.manufacturerVendor = 'Manufacturer / Vendor is required'
    if (!technicalOwner.trim()) newErrors.technicalOwner = 'Technical Owner is required'
    if (!inServiceDate) newErrors.inServiceDate = 'In Service Date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    const body = {
      agencyId,
      name: name.trim(),
      description: description.trim() || null,
      version: version.trim() || null,
      lifecycleStatus,
      manufacturerVendor: manufacturerVendor.trim() || null,
      cloudServiceProvider: cloudServiceProvider.trim() || null,
      operatingSystem: operatingSystem.trim() || null,
      osVersion: osVersion.trim() || null,
      contractNumber: contractNumber.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
      technicalOwner: technicalOwner.trim() || null,
      technicalOwnerEmail: technicalOwnerEmail.trim() || null,
      inServiceDate: inServiceDate || null,
      retirementDate: retirementDate || null,
      isUnsupportedVersion,
      isUpdatable,
      isAgingTechnology,
      isAiEnabled,
      isGenerativeAi,
      riskFlagsVerified,
      businessCriticality: businessCriticality || null,
      coreBusinessFunction: coreBusinessFunction || null,
    }

    try {
      const url = isEditing
        ? `/api/applications/${application.id}`
        : '/api/applications'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrors({ general: data.error ?? 'Failed to save application' })
        return
      }

      const saved = await res.json()
      onSuccess(saved.id)
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">
          {errors.general}
        </div>
      )}

      {/* Basic Information */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Basic Information
          </h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field label="Name" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Application name"
                maxLength={255}
                required
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Brief description of what the application does"
              />
            </Field>
          </div>

          <Field label="Version" required error={errors.version}>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className={inputClass}
              placeholder="e.g. 3.2.1"
              maxLength={100}
              required
            />
          </Field>

          <Field label="Lifecycle Status" required error={errors.lifecycleStatus}>
            <select
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value as LifecycleStatus)}
              className={inputClass}
              required
            >
              {LIFECYCLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Technical Details */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Technical Details
          </h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Manufacturer / Vendor" required error={errors.manufacturerVendor}>
            <input
              type="text"
              value={manufacturerVendor}
              onChange={(e) => setManufacturerVendor(e.target.value)}
              className={inputClass}
              maxLength={255}
              required
            />
          </Field>

          <Field label="Cloud Service Provider">
            <input
              type="text"
              value={cloudServiceProvider}
              onChange={(e) => setCloudServiceProvider(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </Field>

          <Field label="Operating System">
            <input
              type="text"
              value={operatingSystem}
              onChange={(e) => setOperatingSystem(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </Field>

          <Field label="OS Version">
            <input
              type="text"
              value={osVersion}
              onChange={(e) => setOsVersion(e.target.value)}
              className={inputClass}
              maxLength={100}
            />
          </Field>

          <Field label="Technical Owner" required error={errors.technicalOwner}>
            <input
              type="text"
              value={technicalOwner}
              onChange={(e) => setTechnicalOwner(e.target.value)}
              className={inputClass}
              maxLength={255}
              required
            />
          </Field>

          <Field label="Technical Owner Email">
            <input
              type="email"
              value={technicalOwnerEmail}
              onChange={(e) => setTechnicalOwnerEmail(e.target.value)}
              className={inputClass}
              maxLength={255}
              placeholder="owner@agency.gov"
            />
          </Field>

          <Field label="Contract Number">
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </Field>

          <Field label="License Number">
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </Field>

          <Field label="In Service Date" required error={errors.inServiceDate}>
            <input
              type="date"
              value={inServiceDate ?? ''}
              onChange={(e) => setInServiceDate(e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Retirement Date">
            <input
              type="date"
              value={retirementDate ?? ''}
              onChange={(e) => setRetirementDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={isUpdatable}
                onChange={(e) => setIsUpdatable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Updatable</span>
            </label>
          </div>
        </div>
      </section>

      {/* Classification */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Classification
          </h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Business Criticality">
            <select
              value={businessCriticality}
              onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality | '')}
              className={inputClass}
            >
              <option value="">— Select —</option>
              {BUSINESS_CRITICALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Core Business Function">
            <select
              value={coreBusinessFunction}
              onChange={(e) =>
                setCoreBusinessFunction(e.target.value as CoreBusinessFunction | '')
              }
              className={inputClass}
            >
              <option value="">— Select —</option>
              {CORE_BUSINESS_FUNCTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Risk Flags */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Risk Flags
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={isUnsupportedVersion}
              onChange={(e) => setIsUnsupportedVersion(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Unsupported Version</span>
          </label>

          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={isAgingTechnology}
              onChange={(e) => setIsAgingTechnology(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Aging Technology</span>
          </label>

          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={isAiEnabled}
              onChange={(e) => setIsAiEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">AI Enabled</span>
          </label>

          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={isGenerativeAi}
              onChange={(e) => setIsGenerativeAi(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Generative AI</span>
          </label>

          {/* Risk flags review confirmation */}
          <div className="pt-3 border-t border-gray-100 mt-3">
            <p className="text-xs text-gray-500 mb-2">
              {application?.riskFieldsLastVerifiedAt
                ? `Last verified: ${new Date(application.riskFieldsLastVerifiedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                : 'Never verified — risk flags have not been explicitly reviewed since record creation.'}
            </p>
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={riskFlagsVerified}
                onChange={(e) => setRiskFlagsVerified(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 font-medium">
                I have reviewed all risk flags above
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Application'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              router.push(`/dashboard/applications/${application.id}`)
            } else {
              router.push('/dashboard/applications')
            }
          }}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
