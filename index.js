const express = require('express')
const app = express()
app.use(express.json())

// jobId -> { playerName -> { data, lastUpdate } }
const store = {}

const STALE_MS = 5000

function cleanup() {
  const now = Date.now()
  for (const jobId in store) {
    for (const name in store[jobId]) {
      if (now - store[jobId][name].lastUpdate > STALE_MS) {
        delete store[jobId][name]
      }
    }
    if (Object.keys(store[jobId]).length === 0) {
      delete store[jobId]
    }
  }
}

setInterval(cleanup, 3000)

// --- Chat system ---
const chatMessages = []
const chatOnline = {}
const CHAT_MAX = 500
const CHAT_ONLINE_MS = 15000

app.post('/chat/send', (req, res) => {
  const { playerName, message } = req.body
  if (!playerName || !message) return res.status(400).json({ error: 'missing fields' })
  chatMessages.push({ user: playerName, message, type: 'message', time: Date.now() })
  if (chatMessages.length > CHAT_MAX) chatMessages.splice(0, chatMessages.length - CHAT_MAX)
  res.json({ ok: true })
})

app.post('/chat/poll', (req, res) => {
  const { playerName, lastIndex } = req.body
  if (!playerName) return res.status(400).json({ error: 'missing playerName' })
  chatOnline[playerName] = Date.now()
  const idx = lastIndex || 0
  const newMessages = chatMessages.slice(idx)
  res.json({ messages: newMessages, index: chatMessages.length })
})

app.get('/chat/online', (req, res) => {
  const now = Date.now()
  const online = []
  for (const name in chatOnline) {
    if (now - chatOnline[name] < CHAT_ONLINE_MS) {
      online.push(name)
    } else {
      delete chatOnline[name]
    }
  }
  res.json(online)
})

app.post('/sync', (req, res) => {
  const { jobId, playerName, active, dotX, dotY, dotZ, target, velX, velY, velZ, startX, startY, startZ, tof } = req.body
  if (!jobId || !playerName) return res.status(400).json({ error: 'missing jobId or playerName' })

  if (!store[jobId]) store[jobId] = {}

  store[jobId][playerName] = {
    data: { playerName, active: !!active, dotX, dotY, dotZ, target: target || '', velX, velY, velZ, startX, startY, startZ, tof },
    lastUpdate: Date.now()
  }

  const others = []
  for (const name in store[jobId]) {
    if (name === playerName) continue
    others.push(store[jobId][name].data)
  }

  res.json(others)
})

app.post('/clear', (req, res) => {
  const { jobId, playerName } = req.body
  if (store[jobId] && store[jobId][playerName]) {
    delete store[jobId][playerName]
  }
  res.json({ ok: true })
})

app.get('/', (req, res) => {
  res.send('Leagues relay server running')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('Relay server on port ' + PORT))
