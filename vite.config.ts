// vite.config.ts
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Simple Vite plugin to proxy API routes during development
function apiProxyPlugin(): Plugin {
  return {
    name: 'vite-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next()
        }

        try {
          // Extract route name: /api/groq-tts -> groq-tts
          const routeName = req.url.split('?')[0].replace('/api/', '')

          // Handle Groq TTS
          if (routeName === 'groq-tts' && req.method === 'POST') {
            let bodyData = ''
            for await (const chunk of req) {
              bodyData += chunk
            }

            let text = ''
            try {
              const parsed = JSON.parse(bodyData)
              text = parsed.text || ''
            } catch {
              text = bodyData
            }

            if (!text) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid input: text is required' }))
              return
            }

            const apiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GROQ API key not configured' }))
              return
            }

            console.log("🔊 Calling Groq TTS API with text:", text.substring(0, 50) + "...")

            const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'canopylabs/orpheus-v1-english',
                input: text,
                voice: 'autumn',
                response_format: 'wav',
              }),
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error('❌ Groq TTS API error:', response.status, errorText)
              res.statusCode = response.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `GROQ TTS error: ${errorText}` }))
              return
            }

            console.log("✅ Groq TTS API responded successfully")
            const buffer = await response.arrayBuffer()
            res.statusCode = 200
            res.setHeader('Content-Type', 'audio/wav')
            res.end(Buffer.from(buffer))
            return
          }

          // Handle Groq STT
          if (routeName === 'groq-stt' && req.method === 'POST') {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk))
            }
            const rawBody = Buffer.concat(chunks)
            const contentType = req.headers['content-type'] || 'audio/webm'

            const apiKey = process.env.GROQ_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GROQ API key not configured' }))
              return
            }

            const formData = new FormData()
            const blob = new Blob([rawBody], { type: contentType })
            formData.append('file', blob, 'audio.webm')
            formData.append('model', 'whisper-large-v3-turbo')

            const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
              body: formData,
            })

            if (!groqResponse.ok) {
              const errorText = await groqResponse.text()
              res.statusCode = groqResponse.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Groq STT error: ${errorText}` }))
              return
            }

            const data = await groqResponse.json()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text: (data as any).text || '' }))
            return
          }

          // Handle Groq Chat
          if (routeName === 'groq-chat' && req.method === 'POST') {
            let bodyData = ''
            for await (const chunk of req) {
              bodyData += chunk
            }

            const apiKey = process.env.GROQ_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GROQ_API key not configured' }))
              return
            }

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: bodyData,
            })

            if (!groqResponse.ok) {
              const errorText = await groqResponse.text()
              res.statusCode = groqResponse.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Groq chat error: ${errorText}` }))
              return
            }

            const data = await groqResponse.json()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data as any))
            return
          }

          // For other routes, pass through
          return next()
        } catch (err: any) {
          console.error('API proxy error:', err.message)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
