# Admin Workflow Handbook

Last updated: 2025-10-12

---

## Overview

The admin workspace lets curators manage the year → location → collection hierarchy without leaving the dashboard. All actions execute against the new `/api/admin` endpoints and surface inline toast feedback so admins know when changes succeed or fail.

This guide walks through the main flows:

1. Navigating to a year workspace
2. Creating, editing, and deleting locations
3. Reordering locations within a year
4. Assigning collections to locations (and unassigning)
5. Publishing collections with guardrails

> **Tip:** Toasts appear in the top-right corner for every action. Success toasts dismiss automatically; error toasts stay longer so issues are easy to spot.

---

## 1. Open a Year Workspace

- Visit `/admin/years` and select a year card.
- The page loads year metadata, a locations sidebar, and the collection assignment panel.
- All data loads are retried with `fetchWithRetry`, so intermittent network issues surface a toast instead of breaking navigation.

## 2. Manage Locations

### Add
- Click **New Location** in the locations pane.
- Fill out name and optional slug. The slug auto-derives from the name, but you can override it.
- Submit the form. Successful creation shows a green toast and appends the location to the list.

### Edit
- Choose a location and hit **Edit**.
- Update fields and submit. On success, a toast confirms the update and the list refreshes.

### Delete
- Open the overflow menu for a location and select **Delete**.
- Confirm the dialog. If the API removes the record, the location disappears and a success toast appears.
- If the location is still attached to a collection, deletion fails and an error toast explains why.

## 3. Reorder Locations

- Use the up/down arrows next to each location to adjust display order.
- Each click calls `/api/admin/locations/{locationId}/reorder` with the target position.
- The UI optimistically moves the row. If the API rejects the change, a toast rolls back the move.

## 4. Assign Collections

- Collections for the selected year appear in the right panel.
- For each collection, pick a destination location from the dropdown and click **Assign**.
- Success toasts confirm assignments and trigger a lightweight refetch so the UI stays in sync.
- Choose **Clear assignment** to unset the location; a toast confirms completion.
- All fetches run through `fetchWithRetry`, and any failure emits a red toast without clearing the UI state.

## 5. Publish with Guardrails

- From the collection row, click **Publish**.
- The publish API checks `location_id`. If a collection lacks a location, publish returns `409` and the UI raises an error toast explaining the guard requirement.
- Once a collection has a location, publish proceeds and a success toast confirms it.

---

## Troubleshooting

| Symptom | Likely Cause | Recommended Action |
| --- | --- | --- |
| Repeated error toast on load | API unavailable or network outage | Refresh the page; if persistent, inspect server logs. |
| Delete fails with conflict | Collection still linked to location | Unassign collections before deletion. |
| Publish action blocked | Collection missing `location_id` | Assign a location, then retry publish. |

---

## Checklist for Admin QA

- [ ] Create, edit, delete locations and observe toast confirmations.
- [ ] Reorder locations and ensure the order persists after reload.
- [ ] Assign collections, then reload page to confirm persisted state.
- [ ] Attempt to publish without a location and confirm error toast.
- [ ] Publish with a valid location and confirm success toast.

---

Need updates? Ping #admin-cms on Slack or open an issue in the `operations` board.
