# Changelog

## 1.2.0 — free & open source
- The app is now free and open source under the MIT license.
- Removed the 30-day trial, license keys and the license tab; nothing is ever locked.

**Updated file (12 Oct 2026)** — same version number, re-uploaded with these fixes:
- Fixed: in right-to-left pages, the icon of notifications and messages (e.g. health-check warnings) covered the first word of the text.
- Fixed: centred dialogs (e.g. "Create board" and other classic Jira dialogs) were pushed off the screen in right-to-left pages.
- Fixed: AUI buttons such as Add, Delete, Update and Cancel (e.g. board quick filters) stayed in English for Persian users.
- JQL is always shown left-to-right, also inside right-to-left pages.
- "Boards" is now «بوردها» everywhere.
- New: the development panel and project "Development tools" settings are translated (577 texts).
- Fixed: keyboard-shortcut hints read «کلید c» instead of «نوع c»; 32 texts on the settings page's edit tab now show their current Persian wording.
- Fixed: the settings page saved status, priority, resolution and issue-type names in parallel, so a few could fail; they are now saved one kind at a time, and names Jira already shows in Persian are no longer reported as failures.

## 1.1.4
- Fixed: a date chosen in the Jalali picker was rejected by Jira ("invalid date format, use d/MMM/yy").
  The picker now sends the Gregorian value with English month abbreviations, which Jira 10 accepts.

## 1.1.3
- Date fields show the Jalali date **inside the field** (e.g. «۴ مهر ۱۴۰۵»). Jira still stores the Gregorian value.
- Dates can be typed in Jalali: «۱۵ مهر ۱۴۰۵», «1405/7/15» or «۱۵/۷/۱۴۰۵».

## 1.1.2
- Customer portal: the Jalali picker now opens on the first click (button, field or keyboard focus).
- Status / priority / resolution / issue-type names are saved through Jira's own Translations screen,
  so they are kept reliably for Persian users.
