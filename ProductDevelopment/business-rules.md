# State Application Inventory — Business Rules

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27

This document describes the rules that govern how the system behaves — when notifications are sent, what data is required, and how the annual certification process works. Platform administrators can configure most of these rules through the app without any code changes.

---

## Staleness Thresholds

A record becomes "stale" when it hasn't been reviewed or updated within a set number of days. Stale records trigger notifications and can block annual certification.

| Level | Threshold | What Happens |
|-------|-----------|--------------|
| Stale Warning | 90 days | Notification sent to the technical owner and business owner |
| Stale Critical | 180 days | Notification sent to technical owner, business owner, and agency admin. Submission blocked until resolved. |

---

## Notifications

The system sends automated notifications by email and within the app. All triggers listed below are active by default and can be enabled or disabled by platform administrators.

| Trigger | When It Fires | Who Receives It | Message |
|---------|--------------|-----------------|---------|
| Stale Warning | Record not updated in 90 days | Technical owner, business owner | Review and confirm accuracy of the record |
| Stale Critical | Record not updated in 180 days | Technical owner, business owner, agency admin | Immediate review required |
| Certification Reminder | 30 days before certification deadline | Agency admin | Certification due in 30 days — review inventory |
| Certification Due | 7 days before certification deadline | Agency admin, technical owner | Certification due in 7 days — complete and submit |
| Record Retired | Application marked as retired | Agency admin | Confirm the retirement is accurate |

**Notification channels:** Email and in-app

**Note on future releases:** The notification engine is designed as a generic rules processor. Agency-defined alerts (where agencies set their own thresholds) are planned for a future release.

---

## Required Data Fields

Every application record must include the following fields. Records missing any of these cannot be saved.

- Agency name
- Agency number
- Application name
- Lifecycle status
- Version information
- Manufacturer
- Technical owner
- In-service / production date

---

## Controlled Field Values

The following fields only accept values from a fixed list. This keeps data consistent and comparable across all agencies.

### Lifecycle Status
- In development
- In production
- Retirement in progress
- Retired from inventory

### Business Criticality
- Business Essential
- Historical
- Mission Critical
- User Productivity

### Core Business Function
Civil Engagement & Law, Commerce, Communications, Customer Service, Education, Finance, Fiscal & Revenue, Health & Human Services, Health / Safety / Security / Environmental, Land Management & Conservation, Legal, Manufacturing & Delivery, Marketing & Sales, Military, Product Management, Property & Facility, Public Safety, Risk / Audit & Compliance, Transportation & Infrastructure, Vendor & Procurement, Workforce

---

## Annual Certification

| Rule | Value |
|------|-------|
| Certification deadline | September 30 (Washington State example — adopting states should set their own deadline) |
| Attestation required | Yes |
| Minimum records to submit | 1 |
| Stale records block submission | Yes — records stale beyond 180 days must be resolved before submission |

The certification deadline and staleness block threshold are configurable by platform administrators.
