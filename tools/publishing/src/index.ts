import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ 
    name: 'Utoa Publishing Tool',
    version: '0.1.0',
    status: 'ready'
  })
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

export default app