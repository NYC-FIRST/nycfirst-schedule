# Reliability

What protects the system today, what went wrong on Sept 24 and in October 2026, what is known to be fragile, and what is planned. Only the "In place" section describes behavior that exists now.

## In place at launch

- **Drop superseded runs.** If an event's publish status no longer matches the change that started a run, that run stops and the newer change wins.
- **Loop guard.** The Events workflow ignores Monday changes caused by its own ID write-backs.
- **Retries** on the Events workflow's Monday reads and write-backs.
- **Execute Once** on the Events workflow's lookup nodes, so each lookup runs once per publish (since Oct 22, 2026).
- **ID write-back.** Webflow and calendar IDs are stored on each Monday row, so re-publishing updates instead of duplicating.
- **Credentials in n8n.** The production workflows use n8n's credential store for Webflow, Google Calendar and Monday. No credentials are in this repository or the browser.
- **Front-end fallback.** If the closures feed is unreachable, Today's Hours uses the rows Webflow rendered.
- **Operating rule: publish one at a time.** Publishers change one item's publish status, let it finish, then move to the next.

## Incident: Sept 24, 2026 bulk publishing

**What happened.** Many events were set to Published in a short burst the day before launch. Several did not appear on the website or calendar.

**Cause.** Each run reads the whole Events group from Monday and then finds the changed row. During the burst, that read came back empty for some runs. With no row to process, those executions ended as **successful** without publishing anything, so nothing flagged the failure. Other runs that day also failed with explicit errors, including a short period while the workflow was being edited.

**Recovery.** The affected events were re-published one at a time. **29 of 29** were recovered and verified live on the website. That count comes from the post-recovery check of the live site; the n8n execution history does not produce a clean count of affected events.

**Changes afterward.** The operating rule to publish one at a time. Drop superseded runs, retries, and credentials in n8n are in place as listed above. The publishing architecture itself was not changed.

## Incident: Oct 2026 Monday API quota

**What happened.** Monday.com's daily API limit is 10,000 calls. Usage reached about 46,000 on Oct 12, 13,500 on Oct 15 and 12,512 on Oct 19, almost all from the n8n credential. Runs took 80–120 seconds.

**Cause.** In the Events workflow, the first Monday read returns every event on the board as separate items (54 at the time). n8n runs each following node once per incoming item, so the Calendars registry lookup ran 54 times and returned 540 items, and the Monday users and venue/tags lookups then ran 540 times each. One publish cost about 1,138 Monday calls. The published result was still correct, which hid the problem.

**How it was confirmed.** Monday's usage counter rose by 1,138 after a single publish, matching the item counts in that execution (54 → 540 → 540).

**Fix (Oct 22, 2026).** The three lookup nodes are set to Execute Once. One publish now costs about 6 Monday calls and takes about 9 seconds. Six events published within nine seconds all succeeded. Rollback: n8n workflow version `8b332240-da35-44b5-88e7-bc5151dd2264`.

## Known issues

- **Whole-group reads.** The Events and Schedule Changes workflows read the entire group on every change, which is what made bursts fragile.
- **Silent success.** An empty read still ends as a successful execution. There is no failure alert.
- **Duplicated rows copy system IDs.** A duplicated Monday row points at the original's Webflow item and calendar event.
- **Two renamers.** SC Auto-name Rows and the Schedule Changes workflow both rename Schedule Changes rows, with slightly different center labels.
- **Hardcoded mappings.** Some center names, addresses and column mappings live in workflow code rather than the configuration boards.
- **Schedule changes are not on calendars.** Disconnected on purpose until the approach is decided.
- **SC-Status feed.** Reads older columns, does not filter by publish status, and computes "today" in UTC. Current consumer unknown; review before treating as production-critical.
- **Legacy workflows still active.** Eventbrite workflows and Full Sync; see [workflows.md](workflows.md#legacy--maintenance-workflows).
- **Permissions.** Monday column permissions and publisher access are not final.
- **Color overlap.** One program color (FLL red) is close to closure red.

## Planned

None of the following exists yet.

- **Failure alerts** when a workflow errors or processes nothing.
- **Per-item reads**: fetch only the changed row instead of the whole group.
- **Reconciliation**: a scheduled comparison of Monday, Webflow and Google Calendar that reports mismatches.
- **Automatic repair** of mismatches found by reconciliation.
- **Duplicate-row protection**: detect and clear copied system IDs.
- **Single renamer** for Schedule Changes rows.
- **Move hardcoded mappings** into the configuration boards.
- **Schedule changes on calendars**, once the approach is decided.
- **Column permissions** and final publisher access.
- **Retire legacy workflows** (Eventbrite, unused calendar subworkflows) and review Full Sync.
