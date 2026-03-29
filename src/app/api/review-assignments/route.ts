import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, isNull } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, reviewAssignments } from '@/lib/db/schema'

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

    // Get all open assignments joined with applications for this agency
    const agencyApps = await db
      .select()
      .from(applications)
      .where(eq(applications.agencyId, agencyId))

    const agencyAppIds = new Set(agencyApps.map((a) => a.id))

    const allOpenAssignments = await db
      .select()
      .from(reviewAssignments)
      .where(isNull(reviewAssignments.resolvedAt))

    const agencyAssignments = allOpenAssignments.filter((a) =>
      agencyAppIds.has(a.applicationId)
    )

    return NextResponse.json({ assignments: agencyAssignments })
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
