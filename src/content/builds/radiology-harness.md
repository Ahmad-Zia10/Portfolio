---
name: "Radiology Reporting Harness"
kind: "Challenge"
year: "2026"
blurb: "Turns terse radiologist dictation into a structured report by minimally editing an all-normal template. The model returns a patch — only the fields it changed — and the report is re-rendered deterministically, because the scoring metric charges a misrouted finding twice."
stack:
  - "Python"
  - "LLM patching over templates"
  - "Custom eval metric (RES)"
repo: "https://github.com/Ahmad-Zia10/radiology-report-harness"
order: 1
---
