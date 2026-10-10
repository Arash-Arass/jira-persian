# Changelog

## 1.2.0 — free & open source
- The app is now free and open source under the MIT license.
- Removed the 30-day trial, license keys and the license tab; nothing is ever locked.

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
