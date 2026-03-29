import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, isNull } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, reviewAssignments, users } from '@/lib/db/schema'

// ─── POST /api/review-assignments ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const role: string = user.role ?? ''

  // Only agency_admin can create review assignments
  if (role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyId: string | null = user.agencyId ?? null
  if (!agencyId) {
    return NextResponse.json({ error: 'No agency assigned to this user' }, { status: 400 })
  }

  let body: { applicationId?: string; assignedToId?: string; assignedToEmail?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { applicationId, assignedToId, assignedToEmail, notes } = body

  if (!applicationId || typeof applicationId !== 'string') {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
  }
  if (!assignedToId || typeof assignedToId !== 'string') {
    return NextResponse.json({ error: 'assignedToId is required' }, { status: 400 })
  }
  if (!assignedToEmail || typeof assignedToEmail !== 'string') {
    return NextResponse.json({ error: 'assignedToEmail is required' }, { status: 400 })
  }

  // Validate application exists and belongs to this agency
  const [application] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.agencyId, agencyId)
      )
    )

  if (!application) {
    return NextResponse.json({ error: 'Application not found or does not belong to your agency' }, { status: 404 })
  }

  // Validate assignee exists in our users table and belongs to this agency (ISSUE-08)
  // Note: users are auto-upserted on sign-in. If a user hasn't signed in yet, they won't
  // be in the table — treat as not found.
  const [assignee] = await db
    .select({ id: users.id, agencyId: users.agencyId })
    .from(users)
    .where(eq(users.email, assignedToEmail))

  if (!assignee) {
    return NextResponse.json(
      { error: `User "${assignedToEmail}" not found. They must sign in at least once before they can be assigned.` },
      { status: 422 }
    )
  }

  if (assignee.agencyId !== agencyId) {
    return NextResponse.json(
      { error: `User "${assignedToEmail}" does not belong to your agency.` },
      { status: 422 }
    )
  }

  // Create the review assignment
  const assignedById: string = user.id ?? user.email ?? 'unknown'
  const assignedByEmail: string = user.email ?? 'unknown'

  const [created] = await db
    .insert(reviewAssignments)
    .values({
      applicationId,
      assignedById,
      assignedByEmail,
      assignedToId,
      assignedToEmail,
      notes: notes ?? null,
    })
    .returning()

  // Send in-app notification to the assignee (ISSUE-17 fix + CAP-04)
  try {
    const { createAssignmentNotification } = await import('@/lib/notifications')
    await createAssignmentNotification({
      agencyId,
      applicationId,
      applicationName: application.name,
      assignedToId,
      assignedByName: user.name ?? user.email ?? 'A team member',
    })
  } catch (err) {
    // Non-fatal — assignment was created, notification is best-effort
    const { logger } = await import('@/lib/logger')
    logger.error('api.review-assignments', 'Failed to create assignment notification', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json(created, { status: 201 })
}

// ─── GET /api/review-assignments ──────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const role: string = user.role ?? ''
  const userId: string = user.id ?? user.email ?? 'unknown'

  if (role === 'agency_admin') {
    // Return all open assignments for the agency (join with applications)
    const agencyId: string | null = user.agencyId ?? null
    if (!agencyId) {
      return NextResponse.json({ error: 'No agency assigned to this user' }, { status: 400 })
    }

    // DB-level join — filter by agency directly in the query (ISSUE-09)
    const agencyAssignments = await db
      .select({ assignment: reviewAssignments })
      .from(reviewAssignments)
      .innerJoin(applications, eq(reviewAssignments.applicationId, applications.id))
      .where(
        and(
          eq(applications.agencyId, agencyId),
          isNull(reviewAssignments.resolvedAt)
        )
      )

    return NextResponse.json({ assignments: agencyAssignments.map((r) => r.assignment) })
  } else if (role === 'submitter') {
    // Return open assignments assigned to this user
    const assignments = await db
      .select()
      .from(reviewAssignments)
      .where(
        and(
          eq(reviewAssignments.assignedToId, userId),
          isNull(reviewAssignments.resolvedAt)
        )
      )

    return NextResponse.json({ assignments })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
