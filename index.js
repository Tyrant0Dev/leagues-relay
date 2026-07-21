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

app.post('/sync', (req, res) => {
  const { jobId, playerName, active, dotX, dotY, dotZ, target } = req.body
  if (!jobId || !playerName) return res.status(400).json({ error: 'missing jobId or playerName' })

  if (!store[jobId]) store[jobId] = {}

  store[jobId][playerName] = {
    data: { playerName, active: !!active, dotX, dotY, dotZ, target: target || '' },
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
