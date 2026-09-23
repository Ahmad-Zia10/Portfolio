---
code: "GEO"
client: "GIT Software Technologies"
name: "Ride-Hailing & Parcel Platform"
year: "2025"
tags: ["POSTGIS", "REDIS", "NODE.JS", "LEDGER", "CI/CD"]
summary: "Backend services for an all-India ride-hailing and parcel platform — geospatial driver matching and a double-entry ledger for payouts."
stack:
  - "Node.js / Express"
  - "PostgreSQL + PostGIS"
  - "Redis (caching + GEOSEARCH)"
  - "JWT / OTP auth"
  - "Razorpay"
  - "Docker + GitHub Actions"
metrics:
  - label: "Scope"
    value: "All-India"
  - label: "Payouts"
    value: "Double-entry"
order: 4
---

Ride-hailing is a deceptively hard backend problem: the matching has to be
fast and geographic, and the money has to be exactly right.

## Core services

I built the core Node.js and Express backend services — REST APIs over
PostgreSQL with JWT and OTP authentication, Redis caching, and Razorpay
payment integration.

## Matching

I contributed to the geospatial nearest-driver matching, combining PostGIS for
the authoritative geometry with Redis GEOSEARCH for the hot path.

## Money

Driver payouts run on a double-entry ledger, so every movement balances and
the books can be audited rather than reconciled by hand. Shipped on AWS via
Docker with GitHub Actions CI/CD.
