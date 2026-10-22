# v1.2 — Faster, lighter publishing

Released October 22, 2026

## Behind the scenes

### Publishing uses far fewer Monday.com calls

Publishing an event was making about 1,138 calls to Monday.com, and a few busy days went over Monday's daily limit of 10,000. Each publish now makes about 6 calls.

Publishing is also faster: about 9 seconds instead of 1 to 2 minutes.

### Today's Hours reads closures from the page

Since October 12, Today's Hours on the home page reads closures from the website itself instead of asking the automation on every visit.

---

# v1.1 — Launch-day updates

Released September 25, 2026

Changes made on launch day, after v1.0 went live at 1 pm.

---

## Website

### Upcoming cards keep their width

On the home page, clicking Read more used to make the Upcoming panel wider, and Show less made it shrink again. The panel now keeps one fixed width. Opening a description only makes the card taller.

On phones, the panel keeps a small margin on each side.

### Event stripe matches the program color

The colored bar on the left of each event now uses the event's program color, the same color as its tag. For example, FIRST Tech Challenge events are orange and FIRST LEGO League events are red.

* One program: one solid color.
* Several programs: the bar is split into equal bands, one per program.
* No program, or a tag still waiting for review: the standard event blue.

Closures and alternate hours keep their red and amber bars.

Colors come from the Tags board in Monday.com, so changing a program color needs no website change.

### Program filter is always available

Filter by program is now always visible on the events page, not only when Events is selected.

* Choosing a program switches the view to Events and shows only that program's events.
* Choosing All updates or Closures clears the program.
* Links that include a program open on the Events view with that program selected.

### Footer events list

The Events list in the site footer now shows upcoming events from the new events system instead of the old events collection.

---

## Behind the scenes

### Calendar invitations for STEM Centers

Each STEM Center's calendar is listed on the Calendars board in Monday.com. When an event at a STEM Center is published, it is added to the shared calendar and the Center's calendar is invited. Staff tagged on the Center or the event are invited too.

Org Wide events invite the calendar listed on the ES row.

Existing events pick up the new invitations the next time they are published or edited.

### Launch-day publishing issue

During launch preparation, publishing many events within a few minutes caused some of them to appear published in Monday.com without reaching the website or calendar. All affected events were republished and checked against the website.

Until the fixes listed below are in place, publish events one at a time, about 40 seconds apart.

---

## Coming next

* **Failure alerts.** Notify staff when an automation fails, instead of the failure going unnoticed.
* **Automatic repair.** A scheduled check that finds published items missing from the website or calendar and republishes them.
* **Reliable bulk publishing.** Each run reads only the item that changed, and an empty response from Monday.com counts as a failure instead of a success.
* **Calendar updates in place.** Update calendar events instead of deleting and recreating them.
* **Safe duplicating.** A duplicated row gets its own website item and calendar event instead of sharing the original's.
* **Publishing permissions.** Only selected staff can change Posted on Website and the ID columns.
* **Type colors decided by staff.** Event, closure and alternate-hours colors in one place, so staff can choose them and closures stay distinct from program colors.
* **Schedule changes on STEM Center calendars.** Closures and alternate hours are intentionally not sent to calendars yet.
* **Faster Today's Hours.** Cache the closures feed so a traffic spike does not slow the other automations.

---

## Known limits

**FIRST LEGO League red and closure red**
The two colors are nearly the same. The EVENT and CLOSURE labels tell them apart until closure colors are decided.

---

# v1.0 — STEM Center Schedule System

Released September 25, 2026

This is the first full release of the system that keeps STEM Center schedules on nycfirst.org up to date.

Staff submit information through Monday.com. The website and shared calendars update automatically.

If you attended the staff training, everything below reflects what changed afterward.

---

## What the system does

There are two main types of updates.

**Schedule changes**
A closure or alternate hours at one of the eight STEM Centers.

Schedule changes appear under Upcoming and automatically update Today's Hours on the homepage.

**Events**
An event happening at a STEM Center, school, partner site, or other venue.

Events appear on the website and also create entries on the shared Google Calendars, including invitations for tagged staff.

Staff can submit either through the form or directly in Monday.com.

Publishing an item sends it live. Setting it back to Unpublished removes it.

---

## New in this release

### Today's Hours now reads schedule changes directly

Today's Hours now checks the schedule automation directly instead of relying on what happens to be visible elsewhere on the page.

This means filtering, sorting, or shortening the Upcoming list can no longer accidentally make a closed Center appear open.

Multi-day closures now apply to every day in the date range, not just the first day.

### STEM Center cards are now clickable

Each card in Today's Hours links directly to that Center's page.

If a Center is closed and its next open day has no set opening time, the card simply shows that it is closed.

### Off-site events

Events no longer have to take place at a STEM Center.

Select Off-Site and choose a venue. The website will show the venue name, address, and map link.

Venues are stored on their own Monday board, so staff do not need to re-enter addresses each time.

If a venue is not listed yet, enter its name and address in the Other Venue fields. The event can still publish immediately, and the new venue is sent for review so it can be added to the main list.

For events at STEM Centers, the address and map link are pulled automatically from the Center record.

### Program and event tags

Tags now live on their own Monday board.

Each tag has:

* A short code
* A full name
* A website color

Changing a tag or its color can now be done entirely in Monday.com. No website code needs to be changed.

Current tags include:

* Field Trips
* Professional Development
* Work-Based Learning
* Experiential Robotics
* Credit-Bearing Class
* SYEP
* FIRST LEGO League
* FIRST Tech Challenge
* FIRST Robotics Competition
* Workshop
* Build Session
* Benefit
* Guest / Partnership Event

If a needed tag is not listed, staff can type a new one. It will publish in grey and be sent for review so it can later receive a permanent name and color.

### Event images and volunteer opportunities

Images attached to events now appear on the website.

The image is copied into the website's own storage rather than relying on the original attachment link.

Events can also be marked as volunteer opportunities, and that status now appears publicly.

### Better date handling

Start Date and End Date are now combined into one date field.

The picker prevents an end date from being set before the start date, which was the most common issue found during testing.

Multi-day events also remain visible after their first day as long as the event is still happening.

### Reasons for schedule changes

Schedule Change Reason is now selected from a list:

* Holiday
* Weather
* Event
* Maintenance
* Staff Training
* Event Setup
* Build Session
* Other

If Other is selected, the website displays:

`Unforeseen Circumstances`

A separate Private Notes field is available for information that should stay internal, such as staffing, illness, or safety details.

### Clearer STEM Center names

STEM Centers are now named location first and listed alphabetically:

* Brooklyn: District 13
* Cambria Heights: QPL
* Far Rockaway: QPL
* Jamaica: QPL
* Manhattan: Hudson Yards
* Roosevelt Island: Cornell Tech
* South Bronx: Andrew Freedman Home
* Washington Heights: NYPL

The forms now use these full names, so staff no longer need a key for abbreviations such as WH, CT, or AFH.

Rows submitted through forms also name themselves automatically instead of appearing as `Incoming form answer`.

On the website, alternate hours now use the label `ALT HOURS`, with the actual hours shown underneath.

### Fixes

* Archiving an unpublished row no longer creates a new website item.
* Closures no longer create Google Calendar events.
* Republishing an item no longer creates duplicate pending tags or venues.
* Website code is now served from a dedicated location so updates appear immediately instead of waiting on the previous cache.

---

## Coming after September 25

These items were discussed and intentionally left out of v1.0.

### Failure alerts

Right now, if an automation fails, staff are not automatically notified.

Adding email alerts is the highest-priority next step and requires an email account configured inside the automation system.

### A form we control

The current forms are provided by Monday.com.

Monday's forms have limited validation. For example, they cannot enforce detailed date rules, validate time combinations, or easily provide a Submit Another button.

A custom form would give us more control and remove several current workarounds.

### Upcoming reading directly from the automation

Today's Hours already reads directly from the schedule system.

Upcoming still reads information already rendered on the website. That means a display setting could theoretically hide an item from the list.

This is lower risk than Today's Hours because a missing Upcoming item does not incorrectly tell someone that a closed Center is open.

### Read-only submission access

Two testers asked for a way to confirm that their submission was received without being able to publish or edit other items.

A read-only view could address this.

### Simpler publishing control

`Posted on Website` could eventually become a simple on/off control such as `Go Live`.

### Updating events after a new tag is approved

If someone types a new tag, it initially appears in grey.

When that tag is later reviewed and assigned a permanent color, existing events using the temporary version do not automatically reconnect to the approved tag yet.

### Full STEM Center names on Monday rows

Internal row names such as `SC @ CT` could eventually display the full Center name and address.

### Calendar month and week views

Possible future additions include:

* Month view
* Week view
* Remembering a visitor's filters
* Showing only selected programs
* Showing only selected STEM Centers

### Google Business Profile hours

STEM Center hours could eventually update Google Business Profiles so closures and alternate hours appear correctly in Google Search.

This would require each Center to have a verified Google Business listing and should be treated as a separate project.

### CMS cleanup

The website currently contains several overlapping collections for STEM Centers and programs left from previous versions of the site.

Consolidating them would simplify maintenance but would not add new public functionality.

---

## Known limits

**Tag names on mobile**
The full tag name currently appears on hover. Phones do not have hover, so only the short tag code is available there for now.

**Tag and venue limits**
The automation currently reads up to 200 tags and 200 venues.

That is far above current usage, but it is a fixed limit worth documenting.
