# Bitespeed Identity Reconciliation Service

A simple Node.js service for identity reconciliation that links customer contacts based on email and phone number.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the server

```bash
npm start
```

## POST endpoint (/identify)

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d \
'{
    "email":"george@hillvalley.edu",
    "phoneNumber": "717171"
}'

curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d \
'{
    "email":"george@hillva5lley.edu",
    "phoneNumber": "717171"
}'


curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d \
'{
    "email":"george@hillvalley.edu",
    "phoneNumber": "7179171"
}'
```

## Hosting

The app is hosted on <http://bitespeed-assignment.ap-1.evennode.com>

```bash
curl -X POST http://bitespeed-assignment.ap-1.evennode.com/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email":"georsadfge@hillvalley.edu",
    "phoneNumber": "717132371"
}'
```
