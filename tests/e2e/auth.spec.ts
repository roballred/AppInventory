/**
 * E2E tests — Authentication and access control
 *
 * Requires AUTH_BYPASS=true (set automatically by playwright.config.ts webServer env).
 * Tests that each dev account lands on the right dashboard and cannot access
 * pages outside their role.
 */

import { test, expect } from '@playwright/test'
import { fixtures as users } from '../fixtures/users'

async function loginAs(page: any, email: string) {
  await page.goto('/login')
  await page.selectOption('[name="email"]', email)
  await page.click('[type="submit"]')
  await page.waitForURL(/dashboard/)
}

test.describe('dev login bypass', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/State Application Inventory/)
    await expect(page.locator('text=Sign In')).toBeVisible()
  })

  test('platform admin lands on admin dashboard', async ({ page }) => {
    await loginAs(page, users.platformAdmin.email)
    await expect(page.locator('text=Dev Platform Admin')).toBeVisible()
    await expect(page.url()).toContain('/dashboard')
  })

  test('agency admin lands on agency dashboard', async ({ page }) => {
    await loginAs(page, users.agencyAdmin.email)
    await expect(page.locator('text=Dev Test Agency')).toBeVisible()
  })

  test('submitter lands on agency dashboard', async ({ page }) => {
    await loginAs(page, users.submitter.email)
    await expect(page.locator('text=Dev Test Agency')).toBeVisible()
  })

  test('viewer lands on agency dashboard', async ({ page }) => {
    await loginAs(page, users.viewer.email)
    await expect(page.locator('text=Dev Test Agency')).toBeVisible()
  })
})

test.describe('access control', () => {
  test('viewer cannot access the add application page', async ({ page }) => {
    await loginAs(page, users.viewer.email)
    await page.goto('/applications/new')
    await expect(page.locator('text=Not authorized')).toBeVisible()
  })

  test('agency admin cannot access platform admin business rules', async ({ page }) => {
    await loginAs(page, users.agencyAdmin.email)
    await page.goto('/admin/business-rules')
    await expect(page.locator('text=Not authorized')).toBeVisible()
  })

  test('agency admin cannot access another agency inventory', async ({ page }) => {
    await loginAs(page, users.agencyAdmin.email)
    await page.goto('/agencies/dev-agency-002/applications')
    await expect(page.locator('text=Not authorized')).toBeVisible()
  })

  test('platform admin can access all agencies', async ({ page }) => {
    await loginAs(page, users.platformAdmin.email)
    await page.goto('/agencies/dev-agency-001/applications')
    await expect(page.locator('text=Not authorized')).not.toBeVisible()
  })
})
