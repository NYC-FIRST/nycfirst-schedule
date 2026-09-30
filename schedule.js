// Build stamp. deploy.sh rewrites the date on every deploy, so the console
// tells you exactly which version a page is running.
var SCHEDULE_BUILD = '2026-09-30 15:37';
console.log('[schedule] build ' + SCHEDULE_BUILD);

// Centre naming lives at the top level because BOTH DOMContentLoaded blocks below
// need it: the Upcoming rows and the Today's Hours cards. It used to sit inside the
// second block, which put it out of scope for the first.
  var ALIASES = {
    'washington heights': 'WH',
    'cornell tech': 'CT',
    'andrew freedman home': 'AFH',
    'hudson yards': 'HY',
    'manhattan: hudson yards': 'HY',
    'manhattan': 'HY',
    'd13': 'D13',
    'school district 13': 'D13',
    'district 13 stem center': 'D13',
    'district 13 brooklyn': 'D13',
    'qpl far rockaway': 'FR',
    'far rockaway': 'FR',
    'qpl jamaica central': 'JA',
    'jamaica': 'JA',
    'qpl cambria heights': 'CH',
    'cambria heights': 'CH',
    'brooklyn: district 13': 'D13',
    'cambria heights: qpl': 'CH',
    'far rockaway: qpl': 'FR',
    'jamaica: qpl': 'JA',
    'roosevelt island: cornell tech': 'CT',
    'south bronx: andrew freedman home': 'AFH',
    'washington heights: nypl': 'WH'
  };
  function ckey(s) {
    var k = String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return ALIASES[k] || k;
  }

  // Public-facing name overrides, keyed on the canonical abbreviation. Lets a card read
  // differently from the CMS item name without editing items we do not own.
  var DISPLAY = {
    'D13': 'Brooklyn: District 13',
    'CH':  'Cambria Heights: QPL',
    'FR':  'Far Rockaway: QPL',
    'JA':  'Jamaica: QPL',
    'HY':  'Manhattan: Hudson Yards',
    'CT':  'Roosevelt Island: Cornell Tech',
    'AFH': 'South Bronx: Andrew Freedman Home',
    'WH':  'Washington Heights: NYPL'
  };

document.addEventListener('DOMContentLoaded', function () {
  var list = document.querySelector('.announce-list');
  var rows = list ? [].slice.call(list.querySelectorAll('.announce-row')) : [];

  // Today's Hours gets its closures from the API, so it must still run on a page
  // where the Upcoming list is absent or empty. Only the Upcoming rendering is
  // skipped in that case.
  var hasUpcoming = !!list && rows.length > 0;

  // Multi-day closures. The Figma spec writes "CLOSED ALL WEEK" for a Mon-Fri
  // span. A two-day closure is not a week, so the wording is chosen by length.
  // Set to false to always say CLOSED ALL DAY.
  var USE_ALL_WEEK = true;

  var WD  = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function txt(el) { return el ? el.textContent.trim() : ''; }
  var DESC_SEQ = 0;   // unique ids so each details toggle can point at its own text

  // Staff type plain text into the description on Monday, so a URL or an email
  // address arrives as characters, not a link. Build real nodes rather than
  // assigning innerHTML — the text is staff-entered and must never be parsed
  // as markup.
  var LINKIFY = /((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  function linkify(el, text) {
    var last = 0, m;
    LINKIFY.lastIndex = 0;
    while ((m = LINKIFY.exec(text)) !== null) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      if (m[2]) {
        a.href = 'mailto:' + m[2];
      } else {
        a.href = /^www\./i.test(m[1]) ? 'https://' + m[1] : m[1];
        a.target = '_blank';
        a.rel = 'noopener';
      }
      a.textContent = m[0];
      el.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }
  function visible(el) { return !!el && el.offsetParent !== null; }

  // "2026-09-21" -> a date built in local time, so no UTC day-shift
  function parseYMD(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  // "2:00 pm - 6:00 pm" -> "2PM TO 6PM"; "10:30 am - 1:00 pm" -> "10:30AM TO 1PM"
  function tidyHours(s) {
    return (s || '')
      .replace(/:00\b/g, '')
      .replace(/\s*[-–—]\s*/, ' TO ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  // "5:00 pm - 7:00 pm" reads badly mid-sentence. "5-7pm" does not.
  function sentenceHours(s) {
    var m = String(s || '').match(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\s*[-\u2013\u2014to]+\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i);
    if (!m) return String(s || '').toLowerCase();
    var ap = function (x) { return x.toLowerCase().replace(/\./g, ''); };
    var part = function (h, mins, mer) { return h + (mins && mins !== '00' ? ':' + mins : '') + mer; };
    var a = ap(m[3]), b = ap(m[6]);
    // 5-7pm when both ends share a meridiem, 11am-1pm when they do not
    var up = function (x) { return x ? ' ' + x.toUpperCase() : ''; };
    return (a === b ? part(m[1], m[2], '') : part(m[1], m[2], '') + up(a)) + '\u2013' + part(m[4], m[5], '') + up(b);
  }

  // The Reason dropdown is a mix of causes and occasions, so "due to" cannot be
  // bolted onto all of them. Anything not listed falls back to "due to <reason>",
  // and Other, which publishes as Unforeseen Circumstances, is left unsaid: the
  // label exists so nobody has to explain something private in public.
  // A closure reads "closed for staff training"; a change of hours reads "due to
  // staff training". Same reason, different preposition, so each type gets its own
  // wording. Other, which publishes as Unforeseen Circumstances, stays unsaid: the
  // label exists so nobody has to explain something private in public.
  var REASON_CLOSED = {
    'holiday': 'for the holiday',
    'weather': 'due to weather',
    'event': 'for an event',
    'maintenance': 'due to building maintenance',
    'staff training': 'for staff training',
    'event setup': 'for event setup',
    'build session': 'for a build session',
    'unforeseen circumstances': ''
  };
  var REASON_ALT = {
    'holiday': 'due to the holiday',
    'weather': 'due to weather',
    'event': 'due to an event',
    'maintenance': 'due to building maintenance',
    'staff training': 'due to staff training',
    'event setup': 'due to event setup',
    'build session': 'due to a build session',
    'unforeseen circumstances': ''
  };
  function reasonPhrase(reason, type) {
    var key = String(reason || '').trim().toLowerCase();
    if (!key) return '';
    var map = type === 'closed' ? REASON_CLOSED : REASON_ALT;
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    return 'due to ' + reason;
  }

  function whenLine(start, end, type, hours) {
    if (!start) return '';
    var multi = end && end.getTime() > start.getTime();
    var when;

    if (!multi) {
      when = WD[start.getDay()] + ' ' + start.getDate() + ' ' + MON[start.getMonth()];
    } else if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      // same month: month named once, at the end
      when = WD[start.getDay()] + ' ' + start.getDate() +
             ' TO ' + WD[end.getDay()] + ' ' + end.getDate() + ' ' + MON[end.getMonth()];
    } else {
      when = WD[start.getDay()] + ' ' + start.getDate() + ' ' + MON[start.getMonth()] +
             ' TO ' + WD[end.getDay()] + ' ' + end.getDate() + ' ' + MON[end.getMonth()];
    }

    // Closures and alt-hours rows read as a sentence below, so the header is just
    // the date. Events keep their hours in the header.
    if (type !== 'event') return when;
    var tail = hours ? tidyHours(hours) : 'ALL DAY';
    return when + ' · ' + tail;
  }

  // ---------- teaser mode ----------
  // Opt-in via .sc-teaser on the wrapper (the home page). Shows only what
  // starts inside the window, capped, as a flat list with no month headings.
  // Tag code -> { name, color }. Filled at run time from the hidden
  // .row-tagcolors element each row carries, which n8n writes from the Monday
  // Tags board as "FTC=#f57e03=FIRST Tech Challenge|FT=#0e7c7b=Field Trips".
  // Nothing about tags is hardcoded here: adding one is a Monday row, no deploy.
  // Tooltips do not exist on touch devices.
  var TAG_META = {};

  // The Collection List itself must stay UNLIMITED: the Today's Hours script
  // reads every announcement row to find closures, so trimming the list in
  // Webflow would silently stop a closure from overriding a centre's hours.
  var TEASER_DAYS = 30, TEASER_MAX = 5;
  if (hasUpcoming) {
  var teaser = !!(list.closest && list.closest('.sc-teaser'));
  var today0 = new Date(); today0.setHours(0, 0, 0, 0);
  var horizon = new Date(today0.getTime() + TEASER_DAYS * 86400000);
  var teaserShown = 0;

  var stack = document.createElement('div');
  stack.className = 'month-stack';
  list.parentNode.insertBefore(stack, list);

  var card = null, seenMonth = null;

  rows.forEach(function (row) {
    // ---- read what Webflow rendered ----
    var month   = txt(row.querySelector('.month-label'));
    var centre  = txt(row.querySelector('.row-center'));
    // Venue name and address. An off-site event publishes its centre as the
    // catch-all label, which means nothing to a visitor, so the venue wins the
    // display line. data-center still uses the centre, so the filter is unaffected.
    var host    = txt(row.querySelector('.row-host'));
    var addr    = txt(row.querySelector('.row-location'));
    var mapEl   = row.querySelector('.row-maplink');
    var start   = parseYMD(txt(row.querySelector('.row-date')));
    var end     = parseYMD(txt(row.querySelector('.row-enddate')));
    // The title and the announcement are two sibling elements whose classes both
    // begin "announce-body" — sometimes exactly that, sometimes announce-body-name
    // / announce-body-announcement. Order tells them apart, so a class rename in
    // the Designer cannot silently blank the title. Webflow tags an unfilled bind
    // with w-dyn-bind-empty; drop those first so the title never lands in desc.
    var bodies = [].slice.call(row.querySelectorAll('[class*="announce-body"]'))
      .filter(function (e) {
        return !/w-dyn-bind-empty/.test(e.className) && e.textContent.trim();
      });
    var name    = txt(bodies[0]);
    var desc    = txt(bodies[1]);
    // Programs arrive as a delimited list of short codes, e.g. "FLL|FTC".
    // Monday's dropdown hands us comma-separated labels, so accept either.
    // These codes ARE the keys: rename a label on the board and the mapping
    // breaks, which is why they stay short.
    var programs = txt(row.querySelector('.row-programs, .row-program'))
      .split(/[|,]/)
      .map(function (s) { return s.trim().toUpperCase(); })
      .filter(Boolean);
    var regEl   = row.querySelector('.row-reglink');

    // "CODE=#hex=Full Name" entries, pipe separated. A tag still awaiting
    // review has no colour yet and simply keeps the neutral pill.
    txt(row.querySelector('.row-tagcolors')).split('|').forEach(function (entry) {
      var bits = entry.split('=');
      var code = (bits[0] || '').trim().toUpperCase();
      if (!code) return;
      var meta = TAG_META[code] || (TAG_META[code] = {});
      var colour = (bits[1] || '').trim();
      var full   = bits.slice(2).join('=').trim();
      if (colour) meta.color = colour;
      if (full)   meta.name  = full;
    });

    // Finished rows are dropped on EVERY page, not just the teaser. The CMS list
    // is deliberately unfiltered — Today's Hours needs to see a closure that
    // started before today — so the script decides what is still current, using
    // the end date where there is one.
    if (!start) return;
    var last = end || start;
    if (last < today0) return;                // already finished

    if (teaser) {
      if (start > horizon) return;            // past the window
      if (teaserShown >= TEASER_MAX) return;  // rows arrive date-sorted
      teaserShown++;
    }

    var pillClosed = row.querySelector('.status-pill.is-closed');
    var pillAlt    = row.querySelector('.status-pill.is-alt');
    var pillEvent  = row.querySelector('.status-pill.is-event');

    var type = 'event', pillText = 'EVENT', hours = '';
    if (visible(pillClosed))      { type = 'closed'; pillText = 'CLOSURE'; }
    else if (visible(pillAlt))    { type = 'alt';    pillText = 'ALT HOURS'; hours = txt(pillAlt); }
    else if (visible(pillEvent))  { type = 'event';  pillText = 'EVENT';     hours = txt(pillEvent); }
    else {
      // no pill rendered: fall back to the type label
      var t = txt(row.querySelector('.type-label')).toLowerCase();
      if (t.indexOf('clos') === 0) { type = 'closed'; pillText = 'CLOSURE'; }
      else if (t.indexOf('alt') === 0) { type = 'alt'; pillText = 'ALT HOURS'; }
    }
    // an event pill carries the hours string, not the word EVENT
    if (type !== 'closed' && /\d/.test(hours) === false) hours = '';

    // ---- month card ----
    if (teaser) {
      card = stack;
    } else if (month !== seenMonth) {
      card = document.createElement('div');
      card.className = 'month-card';
      var h = document.createElement('div');
      h.className = 'month-head';
      h.textContent = month;
      card.appendChild(h);
      stack.appendChild(card);
      seenMonth = month;
    }

    // ---- build the Option C row ----
    var el = document.createElement('div');
    el.className = 'c-row is-' + type;
    el.setAttribute('data-type', type);
    if (programs.length) el.setAttribute('data-programs', programs.join('|'));
    if (centre) el.setAttribute('data-center', centre);

    var stripe = document.createElement('span');
    stripe.className = 'c-stripe';
    // Events take their programme colour from the Tags board, same as the tag
    // pills. One programme: solid. Several: equal bands, top to bottom, in tag
    // order. No coloured tag: the default event blue from the CSS. Closures and
    // alt hours keep their red / amber so a closure always reads as a closure.
    if (type === 'event') {
      var stripeCols = programs.map(function (pr) { return (TAG_META[pr] || {}).color; })
                               .filter(Boolean);
      if (stripeCols.length === 1) {
        stripe.style.background = stripeCols[0];
      } else if (stripeCols.length > 1) {
        var band = 100 / stripeCols.length;
        stripe.style.background = 'linear-gradient(to bottom,' + stripeCols.map(function (c, i) {
          return c + ' ' + (i * band) + '%,' + c + ' ' + ((i + 1) * band) + '%';
        }).join(',') + ')';
      }
    }
    el.appendChild(stripe);

    var body = document.createElement('div');
    body.className = 'c-body';

    var top = document.createElement('div');
    top.className = 'c-top';

    var when = document.createElement('span');
    when.className = 'c-when';
    when.textContent = whenLine(start, end, type, hours);
    top.appendChild(when);

    var pill = document.createElement('span');
    pill.className = 'c-pill';
    pill.textContent = pillText;
    top.appendChild(pill);

    if (programs.length) {
      programs.forEach(function (pr) {
        var tag = document.createElement('span');
        // unknown codes still render, just in the neutral colour, so adding a
        // programme on the board needs no code change
        tag.className = 'c-tag prog-' + pr.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        tag.textContent = pr;
        var meta = TAG_META[pr] || {};
        // Full name on hover. A tag with no full name simply gets no tooltip.
        if (meta.name) tag.title = meta.name;
        if (meta.color) {
          tag.style.setProperty('--tag-color', meta.color);
          tag.style.setProperty('--tag-ink', '#fff');
        }
        top.appendChild(tag);
      });
    }

    body.appendChild(top);

    var place = host || centre;

    // Location identity for the filter. An off-site event is identified by its venue,
    // a centre event or a closure by its centre. Raw CMS values never surface: a row
    // whose centre is not a real centre and has no venue simply offers no location.
    var centreCode = ckey(centre);
    var locKey = '', locLabel = '', locGroup = '';
    if (host) {
      locLabel = host;
      locKey = 'v-' + host.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      locGroup = 'other';
    } else if (DISPLAY[centreCode]) {
      locLabel = DISPLAY[centreCode];
      locKey = 'c-' + centreCode.toLowerCase();
      locGroup = 'centre';
    }
    if (locKey) {
      el.setAttribute('data-loc', locKey);
      el.setAttribute('data-loc-label', locLabel);
      el.setAttribute('data-loc-group', locGroup);
    }

    // A closure or alt-hours row says one thing, so it says it once. The stacked
    // title / centre / reason lines repeated the same words three times over.
    if (type !== 'event') {
      // The CMS carries the short centre name; the cards carry the location-first
      // one. DISPLAY is the single source for the public wording, so use it here too.
      var display = DISPLAY[ckey(place)] || place;
      var phrase = reasonPhrase(desc, type);
      var sentence;
      if (type === 'closed') {
        sentence = (display || 'This STEM Center') + ' will be closed';
      } else {
        sentence = (display || 'This STEM Center') + ' will be open' +
                   (hours ? ' ' + sentenceHours(hours) : '') +
                   ' instead of its regular hours';
      }
      if (phrase) sentence += (type === 'closed' ? ' ' : ', ') + phrase;
      sentence += '.';
      var sen = document.createElement('div');
      sen.className = 'c-sentence';
      sen.textContent = sentence;
      body.appendChild(sen);
    }

    // Never return early from here — the row is only appended to the card at the
    // bottom of this block, so an early exit drops it silently.
    if (type === 'event' && name) { var n = document.createElement('div'); n.className = 'c-name'; n.textContent = name; body.appendChild(n); }
    if (type === 'event' && place) { var c = document.createElement('div'); c.className = 'c-loc'; c.textContent = place; body.appendChild(c); }
    if (type === 'event' && addr) {
      var ad = document.createElement('div');
      ad.className = 'c-addr';
      var mapHref = mapEl && mapEl.getAttribute('href');
      // A row with no map link still shows the address, just as plain text.
      if (mapHref && mapHref !== '#') {
        var ml = document.createElement('a');
        ml.href = mapHref;
        ml.target = '_blank';
        ml.rel = 'noopener';
        ml.textContent = addr;
        ad.appendChild(ml);
      } else {
        ad.textContent = addr;
      }
      body.appendChild(ad);
    }

    // A closure or alt-hours row publishes its reason as the announcement, and the
    // title already reads "Closed - <reason>". Printing it again just repeats it,
    // so only events carry a description line.
    //
    // One action row under the address: the details toggle on the left, Register on
    // the right. The description opens BELOW the row, so Register never moves when
    // the toggle is pressed. The row is built only when it has something in it.
    var hasDesc = !!(desc && type === 'event');
    // A per-event "add to calendar" link was removed deliberately: Google's
    // template URL makes a COPY, which silently goes stale when the event moves.
    // The page offers one subscribe link to the real calendar instead.
    var regHref = regEl && regEl.getAttribute('href');
    // An empty Webflow link binding comes through as "#", same as the map link.
    if (regHref === '#') regHref = '';

    if (hasDesc || regHref) {
      var acts = document.createElement('div');
      acts.className = 'c-actions';

      var d = null;
      if (hasDesc) {
        d = document.createElement('div');
        d.className = 'c-desc';
        linkify(d, desc);
        // The description is hidden until asked for. A page can carry a hundred
        // near-identical qualifiers, and every row reading the same three sentences
        // is what makes the list unscannable.
        var descId = 'c-desc-' + (++DESC_SEQ);
        d.id = descId;
        d.hidden = true;

        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'c-more';
        more.setAttribute('aria-expanded', 'false');
        more.setAttribute('aria-controls', descId);
        var moreLabel = document.createElement('span');
        moreLabel.textContent = 'Show details';
        // The chevron is decoration; aria-expanded already tells a screen reader the state.
        var moreIcon = document.createElement('span');
        moreIcon.className = 'c-more-icon';
        moreIcon.setAttribute('aria-hidden', 'true');
        moreIcon.textContent = '\u2304';
        more.appendChild(moreLabel);
        more.appendChild(moreIcon);
        more.addEventListener('click', function () {
          var open = d.hidden;
          d.hidden = !open;
          moreLabel.textContent = open ? 'Hide details' : 'Show details';
          moreIcon.textContent = open ? '\u2303' : '\u2304';
          more.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        acts.appendChild(more);
      }

      if (regHref) {
        var a = document.createElement('a');
        a.className = 'c-reg';
        a.href = regHref;
        a.target = '_blank';
        a.rel = 'noopener';
        var regLabel = document.createElement('span');
        regLabel.className = 'c-reg-label';
        regLabel.textContent = 'Register';
        a.appendChild(regLabel);
        var regIcon = document.createElement('span');
        regIcon.className = 'c-reg-icon';
        regIcon.setAttribute('aria-hidden', 'true');
        regIcon.textContent = '\u2197';
        a.appendChild(regIcon);
        acts.appendChild(a);
      }

      body.appendChild(acts);
      if (d) body.appendChild(d);
    }

    el.appendChild(body);
    card.appendChild(el);
  });


  // ---------- filters ----------
  // Opt-in. Only a page whose Upcoming wrapper carries .sc-filters gets a bar,
  // so forgetting the class leaves the previous behaviour untouched rather
  // than putting chips on a three-row teaser.
  var host = list.closest && list.closest('.sc-filters');
  if (host) {
    var allRows = [].slice.call(stack.querySelectorAll('.c-row'));

    // One flat question — what kind of thing — plus two dropdowns. The page carries
    // centre closures and off-site events in one stream, so the axes are:
    //   kind     all / event / closed / alt   single select
    //   location a centre or a venue          single select, always visible
    //   program  an approved tag              single select, events only
    // AND across axes. Program is the only axis that could become multi-select, and
    // matching is written as "any of" so that change stays a one-line change.
    var KIND_LABEL = { all: 'All updates', event: 'Events', closed: 'Closures', alt: 'Alt hours' };

    var typesPresent = [], progsOnPage = [], locs = [];
    allRows.forEach(function (r) {
      var ty = r.getAttribute('data-type');
      if (ty && typesPresent.indexOf(ty) < 0) typesPresent.push(ty);
      (r.getAttribute('data-programs') || '').split('|').forEach(function (pr) {
        if (pr && progsOnPage.indexOf(pr) < 0) progsOnPage.push(pr);
      });
      var key = r.getAttribute('data-loc');
      if (key && !locs.some(function (l) { return l.key === key; })) {
        locs.push({ key: key,
                    label: r.getAttribute('data-loc-label') || '',
                    group: r.getAttribute('data-loc-group') || 'other' });
      }
    });

    // Approved tags only. A vetted tag carries a colour from the Tags board; one still
    // in Pending Review does not, so a typo can never become public navigation.
    var programsPresent = progsOnPage.filter(function (pr) {
      return (TAG_META[pr] || {}).color;
    }).sort();

    var centreLocs = locs.filter(function (l) { return l.group === 'centre'; })
                         .sort(function (a, b) { return a.label.localeCompare(b.label); });
    var otherLocs  = locs.filter(function (l) { return l.group !== 'centre'; })
                         .sort(function (a, b) { return a.label.localeCompare(b.label); });

    var state = { kind: 'all', loc: '', prog: '' };

    var bar = document.createElement('div');
    bar.className = 'sc-filterbar';

    var row = document.createElement('div');
    row.className = 'sc-filterrow';
    bar.appendChild(row);

    var row2 = document.createElement('div');
    row2.className = 'sc-filterrow sc-filterrow-2';
    bar.appendChild(row2);

    // ---- kind: one flat, mutually exclusive set ----
    var kindWrap = document.createElement('div');
    kindWrap.className = 'sc-chips';
    kindWrap.setAttribute('role', 'radiogroup');
    kindWrap.setAttribute('aria-label', 'Filter by type');
    var kindOpts = ['all'].concat(['event', 'closed', 'alt'].filter(function (k) {
      return typesPresent.indexOf(k) > -1;
    }));
    kindOpts.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sc-chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-kind', k);
      b.setAttribute('aria-checked', k === 'all' ? 'true' : 'false');
      b.textContent = KIND_LABEL[k];
      kindWrap.appendChild(b);
    });
    if (kindOpts.length > 2) row.appendChild(kindWrap);

    // ---- location: centres and off-site venues, grouped ----
    var locSel = document.createElement('select');
    locSel.className = 'sc-select sc-select-loc';
    locSel.setAttribute('aria-label', 'Filter by location');
    var locAll = document.createElement('option');
    locAll.value = '';
    locAll.textContent = 'Filter by location';
    locSel.appendChild(locAll);
    function addLocGroup(label, list) {
      if (!list.length) return;
      // Only group when there is something to tell apart.
      var parent = locSel;
      if (centreLocs.length && otherLocs.length) {
        parent = document.createElement('optgroup');
        parent.label = label;
        locSel.appendChild(parent);
      }
      list.forEach(function (l) {
        var o = document.createElement('option');
        o.value = l.key;
        o.textContent = l.label;
        parent.appendChild(o);
      });
    }
    addLocGroup('STEM Centers', centreLocs);
    addLocGroup('Other locations', otherLocs);
    if (locs.length) row2.appendChild(locSel);

    // ---- program: events only ----
    var progSel = document.createElement('select');
    progSel.className = 'sc-select sc-select-prog';
    progSel.setAttribute('aria-label', 'Filter by program');
    var progAll = document.createElement('option');
    progAll.value = '';
    progAll.textContent = 'Filter by program';
    progSel.appendChild(progAll);
    programsPresent.forEach(function (pr) {
      var o = document.createElement('option');
      o.value = pr;
      o.textContent = (TAG_META[pr] || {}).name || pr;
      progSel.appendChild(o);
    });
    if (programsPresent.length) row2.appendChild(progSel);

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'sc-clear';
    clear.textContent = 'Clear';
    row2.appendChild(clear);

    var none = document.createElement('div');
    none.className = 'sc-none';
    var noneMsg = document.createElement('span');
    noneMsg.textContent = 'Nothing matches these filters.';
    var noneClear = document.createElement('button');
    noneClear.type = 'button';
    noneClear.className = 'sc-clear';
    noneClear.textContent = 'Clear filters';
    none.appendChild(noneMsg);
    none.appendChild(noneClear);
    none.hidden = true;

    stack.parentNode.insertBefore(bar, stack);
    stack.parentNode.insertBefore(none, stack.nextSibling);

    // One subscribe link for the whole calendar, above the filters. Subscribing
    // beats a per-event copy: the visitor keeps getting changes, and nothing on
    // their side goes stale when an event moves. The calendar must stay PUBLIC
    // or this link fails for anyone outside the Workspace.
    var SC_CAL_ID = 'c_c7d8204b8b7de757fae31e34d62ffceb541c0f0dc96a0ee5ba499103e4038883@group.calendar.google.com';
    var sub = document.createElement('div');
    sub.className = 'sc-subscribe';

    function subLink(label, href) {
      var a = document.createElement('a');
      a.className = 'sc-subscribe-link';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label;
      return a;
    }
    function subText(t) { return document.createTextNode(t); }

    // One sentence, three links. Only the platform names are clickable: the
    // line is a page-level utility, not a call to action, and making the whole
    // sentence a link would give it the weight of a heading.
    var ICS = 'calendar.google.com/calendar/ical/' + encodeURIComponent(SC_CAL_ID) + '/public/basic.ics';
    sub.appendChild(subText('Add the NYC FIRST events calendar to '));
    sub.appendChild(subLink('Google',
      'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(SC_CAL_ID)));
    sub.appendChild(subText(', '));
    // webcal:// hands Apple Calendar a subscription rather than a downloaded file.
    sub.appendChild(subLink('Apple', 'webcal://' + ICS));
    sub.appendChild(subText(', or '));
    sub.appendChild(subLink('Outlook', 'https://' + ICS));

    stack.parentNode.insertBefore(sub, bar);

    function isDefault() {
      return state.kind === 'all' && !state.loc && !state.prog;
    }

    function syncControls() {
      [].slice.call(kindWrap.children).forEach(function (b) {
        b.setAttribute('aria-checked', b.getAttribute('data-kind') === state.kind ? 'true' : 'false');
      });
      if (locSel.value !== state.loc) locSel.value = state.loc;
      if (progSel.value !== state.prog) progSel.value = state.prog;
      // Program is always on screen. It narrows events only; closures and alt
      // hours carry no programme and are never hidden by it.
      var wantProg = programsPresent.length > 0;
      progSel.classList.toggle('is-off', !wantProg);
      progSel.disabled = !wantProg;
      clear.classList.toggle('is-off', isDefault());
      clear.disabled = isDefault();
    }

    function writeUrl() {
      if (!window.history || !history.replaceState) return;
      var q = [];
      if (state.kind !== 'all') q.push('kind=' + state.kind);
      if (state.loc)            q.push('loc=' + state.loc);
      if (state.prog)           q.push('program=' + state.prog.toLowerCase());
      history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash);
    }

    function readUrl() {
      var q = new URLSearchParams(location.search);
      var kind = q.get('kind');
      if (kind && kindOpts.indexOf(kind) > -1) state.kind = kind;
      var loc = q.get('loc');
      if (loc && locs.some(function (l) { return l.key === loc; })) state.loc = loc;
      var prog = (q.get('program') || '').toUpperCase();
      if (prog && programsPresent.indexOf(prog) > -1) { state.prog = prog; state.kind = 'event'; }
    }

    function apply() {
      syncControls();
      var shown = 0;

      allRows.forEach(function (r) {
        var ty = r.getAttribute('data-type');
        var okKind = state.kind === 'all' || ty === state.kind;
        var okLoc  = !state.loc || r.getAttribute('data-loc') === state.loc;

        // "any of" so multi-select programmes stay a one-line change
        var rowProgs = (r.getAttribute('data-programs') || '').split('|');
        var wanted = state.prog ? [state.prog] : [];
        var okProg = ty !== 'event' || !wanted.length ||
                     wanted.some(function (pr) { return rowProgs.indexOf(pr) > -1; });

        var show = okKind && okLoc && okProg;
        r.style.display = show ? '' : 'none';
        if (show) shown++;
      });

      // a month card with nothing left in it is noise
      [].slice.call(stack.querySelectorAll('.month-card')).forEach(function (card) {
        var any = [].slice.call(card.querySelectorAll('.c-row')).some(function (r) {
          return r.style.display !== 'none';
        });
        card.style.display = any ? '' : 'none';
      });

      none.hidden = (shown !== 0);
      writeUrl();
    }

    function reset() {
      state.kind = 'all';
      state.loc = '';
      state.prog = '';
      apply();
    }

    bar.addEventListener('click', function (e) {
      var hit = e.target.closest ? e.target.closest('.sc-chip, .sc-clear') : null;
      if (!hit) return;
      if (hit.classList.contains('sc-clear')) { reset(); return; }
      state.kind = hit.getAttribute('data-kind');
      if (state.kind !== 'event') state.prog = '';
      apply();
    });

    noneClear.addEventListener('click', reset);
    locSel.addEventListener('change', function () { state.loc = locSel.value; apply(); });
    // Picking a programme means "show me those events", so it moves the view to
    // Events. Choosing All updates or Closures afterwards clears the programme.
    progSel.addEventListener('change', function () {
      state.prog = progSel.value;
      if (state.prog) state.kind = 'event';
      apply();
    });

    window.addEventListener('popstate', function () {
      state.kind = 'all'; state.loc = ''; state.prog = '';
      readUrl();
      apply();
    });

    readUrl();
    apply();
  }


  // ---------- teaser layout ----------
  // The home page section was built as two grid columns, but the left one only
  // holds a subtitle, so it rendered as a tall empty white box with a sliver of
  // the background photo showing through the gap. Fold whatever is in the other
  // columns into the panel that holds the list, then remove the emptied ones.
  // Content is MOVED, never discarded. CSS collapses the grid to one column.
  if (teaser) {
    var grid = list.closest && list.closest('.sc-teaser');
    var keep = grid && [].slice.call(grid.children).filter(function (c) {
      return c.contains(list);
    })[0];

    if (grid && keep) {
      keep.classList.add('sc-keep');
      [].slice.call(grid.children).forEach(function (col) {
        if (col === keep) return;
        var frag = document.createDocumentFragment();
        while (col.firstChild) frag.appendChild(col.firstChild);
        keep.insertBefore(frag, keep.firstChild);   // fragment preserves order
        col.parentNode.removeChild(col);
      });
    }
  }

  list.style.display = 'none';
  }   // end of the Upcoming block
});

document.addEventListener('DOMContentLoaded', function () {
  var DAYS  = ['sun','mon','tue','wed','thu','fri','sat'];
  var NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // The announcements collection and the hours collection do not name centers the same
  // way. Canonicalise both sides to an abbreviation before matching, or a closed center
  // silently shows its normal opening hours. Unlisted names fall back to matching
  // themselves, so a ninth center degrades gracefully.

  // Card order, matching the nav menu on the internal site. Done here rather than with a
  // CMS sort field, because adding a field is a collection structure change and that
  // blocks Webflow's publish-one-item-at-a-time, forcing a full site publish.
  var ORDER = ['D13','CH','FR','JA','HY','CT','AFH','WH'];


  // Each centre's own page. Jamaica's URL is /jc, not /ja.
  var SLUG = {
    'D13': 'd13', 'CH': 'ch', 'FR': 'fr', 'JA': 'jc',
    'HY': 'hy', 'CT': 'ct', 'AFH': 'afh', 'WH': 'wh'
  };

  // Public wording for the labels that are not clock hours, keyed on the CMS text
  // lowercased. Lets the pill and the sentence differ from what the hours field says.
  var SPECIALS = {
    'by appointment': {
      pill: 'SCHEDULED PROGRAMS',
      detail: 'Open for scheduled student and educator programs. No public drop-in hours.'
    }
  };

  function nyParts() {
    var f = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', hour12:false, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', weekday:'short' });
    var o = {};
    f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    var wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday);
    var hh = parseInt(o.hour, 10) % 24;   // hour12:false can report 24 at midnight
    return { iso: o.year + '-' + o.month + '-' + o.day, wd: wd, min: hh * 60 + parseInt(o.minute, 10) };
  }

  function toMin(s) {
    var m = s.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    var h = parseInt(m[1],10), mi = m[2] ? parseInt(m[2],10) : 0, ap = m[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    var v = h * 60 + mi;
    return v === 0 ? 1440 : v;          // midnight as an end time means end of day
  }

  function parseRange(raw) {
    if (!raw) return { kind:'closed' };
    var s = raw.trim();
    if (!s || /^closed$/i.test(s)) return { kind:'closed' };
    var parts = s.split(/\s*(?:-|–|—|to)\s*/i);
    if (parts.length === 2) {
      var a = toMin(parts[0]), b = toMin(parts[1]);
      if (a !== null && b !== null) return { kind:'range', start:a, end:b, label:s };
    }
    return { kind:'special', label:s };
  }

  function fmt(min) {
    var h = Math.floor(min / 60) % 24, mi = min % 60;
    var ap = h >= 12 ? 'pm' : 'am', h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (mi < 10 ? '0' + mi : mi) + ' ' + ap;
  }

  function visible(el) { return !!el && getComputedStyle(el).display !== 'none'; }

  // Where the overrides come from.
  //
  // Preferred: a dedicated, UNLIMITED collection list with class .hrs-list, whose
  // items carry .hrs-center / .hrs-date / .hrs-enddate / .hrs-type / .hrs-hours.
  // It exists so that how many rows the Upcoming block DISPLAYS can never change
  // whether a closure applies — a capped Upcoming list used to silently drop
  // closures and leave a centre showing normal hours.
  //
  // Falls back to the Upcoming rows when that list is not on the page.
  var overrides = {};

  function addOverride(centerText, fromText, toText, entry) {
    var from = String(fromText || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return;
    var to = String(toText || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) to = from;

    for (var day = from, guard = 0; guard < 400; guard++) {
      var k = ckey(centerText) + '|' + day;
      // a closure outranks alt hours on the same day
      if (!(overrides[k] && overrides[k].kind === 'closed')) overrides[k] = entry;
      if (day === to) break;
      day = isoPlus(day, 1);
    }
  }

  function buildOverridesFromDom() {
  var hrsSource = document.querySelectorAll('.hrs-list .hrs-row');

  if (hrsSource.length) {
    hrsSource.forEach(function (row) {
      var centre = txt(row.querySelector('.hrs-center'));
      var from   = txt(row.querySelector('.hrs-date'));
      if (!centre || !from) return;

      var kind = txt(row.querySelector('.hrs-type')).toLowerCase();
      // An Event is informational and never changes a centre's hours.
      if (kind.indexOf('event') === 0) return;

      var entry = (kind.indexOf('alt') === 0)
        ? { kind:'alt', label: txt(row.querySelector('.hrs-hours')) }
        : { kind:'closed' };

      addOverride(centre, from, txt(row.querySelector('.hrs-enddate')), entry);
    });
  } else {

  document.querySelectorAll('.announce-row').forEach(function (row) {
    var c = row.querySelector('.row-center'), d = row.querySelector('.row-date');
    if (!c || !d) return;

    // An Event is informational and has no effect on hours. Skip it entirely — writing
    // an override here would mark the center closed, since anything that is not a
    // visible alt-hours pill is treated as a closure below.
    if (visible(row.querySelector('.status-pill.is-event'))) return;

    var altPill = row.querySelector('.status-pill.is-alt');
    var entry = visible(altPill)
      ? { kind:'alt', label: altPill.textContent.trim() }
      : { kind:'closed' };

    // A multi-day announcement covers every day in the span, not just the first.
    // The end date is inclusive: 16 to 18 means all three days are affected.
    var from = d.textContent.trim();
    var e    = row.querySelector('.row-enddate');
    var to   = e ? e.textContent.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) to = from;

    for (var day = from, guard = 0; guard < 400; guard++) {
      var k = ckey(c.textContent) + '|' + day;
      // a closure outranks alt hours on the same day
      if (!(overrides[k] && overrides[k].kind === 'closed')) overrides[k] = entry;
      if (day === to) break;
      day = isoPlus(day, 1);
    }
  });

  }

  }

  // Today's Hours reads its overrides from n8n, not from whatever the page
  // happens to render. A collection list's limit, filter or sort can then never
  // hide a closure — which is exactly how a live closure went missing before.
  // The page rows are only a fallback for when the API cannot be reached.
  var OVERRIDES_URL = 'https://n8n.nycfirst.org/webhook/sc-overrides';

  function loadOverrides() {
    if (!window.fetch || !window.Promise) {
      buildOverridesFromDom();
      return { then: function (f) { f(); } };
    }
    return fetch(OVERRIDES_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var days = (data && data.days) || {};
        Object.keys(days).forEach(function (iso) {
          Object.keys(days[iso]).forEach(function (code) {
            var o = days[iso][code] || {};
            // The API already speaks canonical codes (CT, WH). Do NOT run them
            // through ckey() — it lowercases anything not in ALIASES, and the
            // cards look these up in upper case.
            var key = String(code).trim().toUpperCase();
            overrides[key + '|' + iso] = (o.kind === 'alt')
              ? { kind: 'alt', label: o.hours || '' }
              : { kind: 'closed' };
          });
        });
      })
      .catch(function (e) {
        console.warn('[schedule] overrides API unreachable, using the page rows instead.', e);
        buildOverridesFromDom();
      });
  }

  function isoPlus(iso, n) {
    var p = iso.split('-');
    var dt = new Date(Date.UTC(+p[0], +p[1]-1, +p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0,10);
  }

  function renderHours() {
  var hoursList = document.querySelector('.hours-list');
  if (hoursList) {
    [].slice.call(hoursList.querySelectorAll('.center-card'))
      .map(function (card) {
        var el = card.querySelector('.center-name-today');
        var idx = ORDER.indexOf(ckey(el ? el.textContent : ''));
        return { card: card, idx: idx < 0 ? 999 : idx };
      })
      .sort(function (a, b) { return a.idx - b.idx; })
      .forEach(function (o) { hoursList.appendChild(o.card); });
  }

  var now = nyParts();

  document.querySelectorAll('.center-card').forEach(function (card) {
    var nameEl = card.querySelector('.center-name-today');
    var pill   = card.querySelector('.status-pill');
    var detail = card.querySelector('.center-detail');
    if (!nameEl || !pill || !detail) return;

    var ck = ckey(nameEl.textContent);
    if (DISPLAY[ck]) nameEl.textContent = DISPLAY[ck];

    // The whole card opens that centre's page. The name becomes a real link so
    // keyboard and screen-reader users get the same route.
    if (SLUG[ck] && card.getAttribute('data-sc-linked') !== '1') {
      card.setAttribute('data-sc-linked', '1');
      var href = '/stem-center-locations/' + SLUG[ck];
      var a = document.createElement('a');
      a.className = 'center-link';
      a.href = href;
      a.textContent = nameEl.textContent;
      nameEl.textContent = '';
      nameEl.appendChild(a);
      card.classList.add('is-linked');
      card.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) return;
        window.location.href = href;
      });
    }

    function dayInfo(offset) {
      var iso = isoPlus(now.iso, offset);
      var ov = overrides[ck + '|' + iso];
      if (ov && ov.kind === 'closed') return { kind:'closed', over:true };
      if (ov && ov.kind === 'alt') { var r = parseRange(ov.label); r.over = true; return r; }
      var el = card.querySelector('.h-' + DAYS[(now.wd + offset) % 7]);
      return parseRange(el ? el.textContent : '');
    }

    function dayLabel(i) {
      if (i === 0) return 'today';
      if (i === 1) return 'tomorrow';
      if (i < 7) return NAMES[(now.wd + i) % 7];
      return 'on ' + isoPlus(now.iso, i);
    }

    // Next day this center is usable, as a phrase that includes the closing time.
    function nextOpenPhrase() {
      for (var i = 0; i < 14; i++) {
        var d = dayInfo(i);
        if (d.kind === 'closed') continue;
        // Days with no clock hours (by appointment, scheduled programs) cannot
        // be announced as an opening time, so they are skipped rather than
        // described. If nothing in the next fortnight has clock hours the card
        // says only that the centre is closed.
        if (d.kind === 'special') continue;
        if (i === 0 && now.min >= d.start) continue;
        return 'Open ' + fmt(d.start) + ' – ' + fmt(d.end) + ' ' + dayLabel(i);
      }
      return '';
    }

    function closedLine(lead) {
      var p = nextOpenPhrase();
      return p ? lead + ' \u00b7 ' + p + '.' : lead + '.';
    }

    function setPill(cls, text) {
      pill.className = 'status-pill ' + cls;
      pill.textContent = text;
    }

    var today = dayInfo(0);

    // No clock hours today — by appointment, scheduled programs, and similar.
    if (today.kind === 'special') {
      var sp = SPECIALS[today.label.trim().toLowerCase()];
      setPill('is-special', sp ? sp.pill : today.label.toUpperCase());
      detail.textContent = sp ? sp.detail : today.label;
      return;
    }

    // Shut all day: the CMS says Closed, or a closure was announced.
    if (today.kind === 'closed') {
      setPill('is-closed', 'CLOSED TODAY');
      detail.textContent = closedLine('Closed today');
      return;
    }

    // An announced alt-hours day keeps the yellow pill all day, showing the actual hours.
    // Rare and important enough to outrank the pill-describes-right-now rule below.
    if (today.over) {
      // The pill names the situation; the hours themselves belong in the sentence,
      // where they read as words rather than as a label.
      setPill('is-alt', 'ALT HOURS');
      var altRange = 'Alternate hours today: ' + fmt(today.start) + ' – ' + fmt(today.end);
      if (now.min >= today.start && now.min < today.end) {
        detail.textContent = 'Open now · ' + altRange + '.';
      } else if (now.min < today.start) {
        detail.textContent = 'Closed now · ' + altRange + '.';
      } else {
        detail.textContent = closedLine('Closed for the day');
      }
      return;
    }

    // Regular hours. The pill stays REGULAR HOURS all day — it answers "is this center
    // running its normal schedule", not "is the door open this minute". The detail line
    // carries the right-now status.
    setPill('is-open', 'REGULAR HOURS');
    if (now.min >= today.start && now.min < today.end) {
      detail.textContent = 'Open until ' + fmt(today.end) + '.';
    } else if (now.min < today.start) {
      detail.textContent = 'Closed now · Open ' + fmt(today.start) + ' – ' + fmt(today.end) + ' today.';
    } else {
      detail.textContent = closedLine('Closed for the day');
    }
  });
  }

  loadOverrides().then(renderHours);
});

