# Success Metrics and Instrumentation

## Pilot Success Criteria

The following metrics define success for the CAP-10 pilot deployment.

| Metric | Target | Measurement Method |
|---|---|---|
| Certification submission rate | ≥ 80% of agencies submit by deadline | `certifications` table, `status = 'submitted'` count |
| Critical stale applications at submission | < 5% of total inventory | `criticalStaleCount / recordCount` per certification |
| Risk dashboard adoption | ≥ 60% of agency admins view risk dashboard weekly | Server access logs (future) |
| Work queue clearance rate | < 20 items in queue per agency at deadline | Work queue API response |
| Notification open rate | ≥ 40% of notifications read within 7 days | `notifications` table, `readAt IS NOT NULL` within 7 days of `createdAt` |

## Instrumentation Roadmap

### Phase 1 — Available Now (from existing schema)
These metrics can be queried directly from the database with no code changes:

```sql
-- Certification submission rate
SELECT
  COUNT(*) FILTER (WHERE status = 'submitted' OR status = 'approved') AS submitted,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('submitted','approved')) / COUNT(*), 1) AS pct
FROM certifications WHERE year = 2025;

-- Avg critical stale at submission
SELECT AVG(critical_stale_count::float / NULLIF(record_count,0)) * 100 AS avg_critical_pct
FROM certifications WHERE status IN ('submitted','approved') AND year = 2025;

-- Notification read rate (7-day window)
SELECT
  COUNT(*) FILTER (WHERE read_at IS NOT NULL AND read_at <= created_at + INTERVAL '7 days') AS read_7d,
  COUNT(*) AS total
FROM notifications WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Phase 2 — Requires Instrumentation Code

- **Page view tracking**: Add server-side logging in dashboard page server components for `/dashboard/risk` visits per agency
- **Work queue action tracking**: Log dismissals vs. edits ratio in `work_queue_dismissals`
- **Time-to-review**: Compute median days from assignment creation to `resolvedAt`

### Phase 3 — External Analytics (Optional)
- Export anonymized metrics to a BI tool (Power BI, Grafana) via read replica
- Set up weekly automated metric snapshot to a `metrics_snapshots` table

## Reporting

The Platform Admin Portfolio page (`/admin/portfolio`) provides a real-time view of health scores and staleness distribution across all agencies — suitable for pilot review meetings.
