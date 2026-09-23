---
code: "LRN"
client: "Personal Project"
name: "Learnr"
year: "2024"
tags: ["MERN", "K6", "PAYMENTS", "LOAD TESTING"]
repo: "https://github.com/Ahmad-Zia10"
summary: "A MERN e-learning platform, load-tested to 500+ concurrent users at p95 under 200ms."
stack:
  - "Node.js / Express"
  - "MongoDB (Mongoose)"
  - "JWT / OTP auth"
  - "Razorpay checkout"
  - "Cloudinary media"
  - "k6 load testing"
metrics:
  - label: "Concurrent users"
    value: "500+"
  - label: "p95 latency"
    value: "<200ms"
  - label: "Success rate"
    value: ">99.5%"
order: 5
---

A full e-learning platform, built to find out where it breaks before users do.

## The platform

A MERN application with JWT and OTP authentication, Razorpay checkout, and
Cloudinary media uploads, over a MongoDB and Mongoose data model behind a
RESTful Express API.

## Proving it holds

I ran load and integration testing with k6, validating reliability under 500+
concurrent users at p95 latency below 200ms with a success rate above 99.5%.
Knowing the number matters more than assuming it's fine.
