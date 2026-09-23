---
code: "VOX"
client: "GIT Software Technologies"
name: "Speech-to-Speech Voice Agent"
year: "2025"
tags: ["VOICE AI", "LIVEKIT", "AGENTIC", "WEBRTC", "VLLM"]
accentColor: "#FFC864"
summary: "A production speech-to-speech agent that answers a real phone line, holds a sub-second conversation, and actually completes the task it was asked to do."
stack:
  - "Kyutai Unmute (streaming STT/TTS)"
  - "LiveKit / WebRTC"
  - "SIP bridge over OpenAI Realtime protocol"
  - "vLLM-served Llama 3.1"
  - "Docker + AWS EC2"
  - "React ops dashboard"
metrics:
  - label: "Latency"
    value: "<1s"
  - label: "Concurrency"
    value: "Pooled GPU"
  - label: "Channel"
    value: "Real SIP line"
order: 1
---

Most voice demos stop at transcription. This one had to survive a real hotel
switchboard — a guest picks up the phone, speaks naturally, and expects the
thing on the other end to *do* something.

## The pipeline

I architected the agent on the Kyutai Unmute pipeline, with streaming STT and
TTS and server-side VAD so turn-taking feels conversational rather than
walkie-talkie. The harder half was transport: bridging LiveKit's WebRTC world
to an actual SIP phone line through a WebSocket audio bridge speaking the
OpenAI Realtime protocol. End to end, it holds sub-second conversational
latency.

## Doing the work, not just describing it

The agent calls tools mid-call against a vLLM-served Llama 3.1 using
OpenAI-compatible function definitions. In practice that means dispatching a
taxi through Rapido, routing a food order to the hotel POS or to Swiggy and
Zomato, and booking laundry, spa, and housekeeping in live hotel systems —
then confirming each one back to the guest in the same breath.

## Making it production

Concurrency came from per-call session isolation over a pooled set of GPU
instances in Docker. The transactional layer handles HMAC-SHA512-signed PayU
checkout, SMS and email confirmation through MSG91 and SendGrid, RAG-grounded
answers for property questions, and CRM sync — all surfaced in a React ops
dashboard so staff can watch calls in flight.
