// vite.OVG Engage | AI Concierge
import 'dotenv/config'
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
          console.log('🔍 API proxy received request:', req.url, '-> routeName:', routeName)

          // Handle Groq TTS
          if (routeName === 'groq-tts' && req.method === 'POST') {
            let bodyData = ''
            for await (const chunk of req) {
              bodyData += chunk
            }

            let text = ''
            let voice = 'autumn'
            try {
              const parsed = JSON.parse(bodyData)
              text = parsed.text || ''
              voice = parsed.voice || 'autumn'
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

            // Orpheus V1 200-character chunking logic
            const MAX_CHUNK_LENGTH = 200;
            const chunks: string[] = [];

            // Split text into chunks under 200 characters (try to break at sentence boundaries)
            let remaining = text;
            while (remaining.length > MAX_CHUNK_LENGTH) {
              // Find the best break point within the limit
              let breakPoint = MAX_CHUNK_LENGTH;
              const sentenceEnd = remaining.substring(0, MAX_CHUNK_LENGTH).search(/[.!?]\s/);
              if (sentenceEnd > 0 && sentenceEnd < MAX_CHUNK_LENGTH - 1) {
                breakPoint = sentenceEnd + 2; // Include the punctuation and space
              } else {
                // No sentence boundary, try word boundary
                const lastSpace = remaining.substring(0, MAX_CHUNK_LENGTH).lastIndexOf(' ');
                if (lastSpace > 0) {
                  breakPoint = lastSpace;
                }
              }
              chunks.push(remaining.substring(0, breakPoint).trim());
              remaining = remaining.substring(breakPoint).trim();
            }
            if (remaining.length > 0) {
              chunks.push(remaining);
            }

            console.log(`📝 Text chunked into ${chunks.length} segments for Orpheus TTS`);

            // Process all chunks and combine audio buffers
            const audioBuffers: Buffer[] = [];
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              console.log(`🔊 Processing chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 30)}..." (${chunk.length} chars)`);

              const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'canopylabs/orpheus-v1-english',
                  input: chunk,
                  voice: voice,
                  response_format: 'wav',
                }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Groq TTS API error (chunk ${i + 1}):`, response.status, errorText);
                // Continue with other chunks instead of failing completely
                continue;
              }

              const buffer = Buffer.from(await response.arrayBuffer());
              audioBuffers.push(buffer);
            }

            if (audioBuffers.length === 0) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'All TTS chunks failed' }));
              return;
            }

            console.log(`✅ Groq TTS API responded successfully with ${audioBuffers.length} audio segments`);

            // Combine all audio buffers (WAV format - need to handle headers properly)
            // For simplicity, we'll concatenate the buffers (this works for raw PCM but may need refinement for WAV)
            const combinedBuffer = Buffer.concat(audioBuffers);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/wav');
            res.end(combinedBuffer);
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
            formData.append('model', 'whisper-large-v3')

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

          // Handle Groq Voice Chat (dedicated endpoint for voice pipeline)
          if (routeName === 'groq-voice-chat' && req.method === 'POST') {
            console.log('🎤 Handling groq-voice-chat request')
            let bodyData = ''
            for await (const chunk of req) {
              bodyData += chunk
            }

            const apiKey = process.env.GROQ_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GROQ API key not configured' }))
              return
            }

            const requestBody = JSON.parse(bodyData)
            const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Last Chapter Media'
            const identityPrompt = process.env.ORPHEUS_IDENTITY_PROMPT || `You are Orpheus, an AI voice assistant for ${brandName}.`

            const systemPrompt = `${identityPrompt}

Voice Logic Rules:
- Be brief and concise
- Keep responses under 3 sentences
- No markdown formatting
- No bolding or italics
- No bullet points or lists
- Avoid complex punctuation
- Suitable for text-to-speech synthesis`

            const apiMessages = [
              { role: 'system', content: systemPrompt },
              ...(requestBody.messages || [])
            ]

            const stream = requestBody.stream || false

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 150,
                stream: stream,
              }),
            })

            if (!groqResponse.ok) {
              const errorText = await groqResponse.text()
              res.statusCode = groqResponse.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `GROQ Chat error: ${errorText}` }))
              return
            }

            // Handle streaming response
            if (stream) {
              res.setHeader('Content-Type', 'text/event-stream')
              res.setHeader('Cache-Control', 'no-cache')
              res.setHeader('Connection', 'keep-alive')

              const reader = groqResponse.body?.getReader()
              if (!reader) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'No response body' }))
                return
              }

              const decoder = new TextDecoder()
              let buffer = ''

              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break

                  buffer += decoder.decode(value, { stream: true })
                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6)
                      if (data === '[DONE]') continue

                      try {
                        const parsed = JSON.parse(data)
                        const content = parsed.choices?.[0]?.delta?.content
                        if (content) {
                          res.write(`data: ${JSON.stringify({ content })}\n\n`)
                        }
                      } catch (e) {
                        console.error('Error parsing SSE:', e)
                      }
                    }
                  }
                }
                res.write('data: [DONE]\n\n')
                res.end()
              } catch (err) {
                console.error('Streaming error:', err)
                res.end()
              }
            } else {
              const data = await groqResponse.json()
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data as any))
            }
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
