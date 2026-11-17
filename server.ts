import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw Object.assign(
      new Error('GEMINI_API_KEY is not configured. Configure your key in Settings > Secrets.'),
      { status: 400, code: 'API_KEY_MISSING' }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string; hint?: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusCandidate =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status)
      : 500;
  const status = Number.isFinite(statusCandidate) && statusCandidate >= 400 ? statusCandidate : 500;

  if (/RESOURCE_EXHAUSTED|429|quota|billing|paid/i.test(rawMessage)) {
    return {
      status: 429,
      message: rawMessage,
      hint: 'This model requires a billing-enabled paid API key or exceeded free-tier quota. You can select a paid key in Settings > Secrets.',
    };
  }
  if (/PERMISSION_DENIED|API_KEY_INVALID|API_KEY_MISSING|403|401/i.test(rawMessage)) {
    return {
      status: 403,
      message: rawMessage,
      hint: 'Please verify your GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }
  return { status, message: rawMessage };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Text-to-Speech (gemini-3.8-flash-tts)
  app.post('/api/tts', async (req, res) => {
    try {
      const { mode = 'single', text, style, voiceName = 'Kore', dialogue } = req.body ?? {};
      const ai = getAiClient();

      if (mode === 'dual' && Array.isArray(dialogue) && dialogue.length === 2) {
        const [first, second] = dialogue;
        if (!first?.text?.trim() || !second?.text?.trim()) {
          res.status(400).json({ error: 'Both speakers must have dialogue text.' });
          return;
        }
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${first.speaker}: ${first.text}`,
                  speechMetadata: {
                    speaker: first.speaker,
                    style: first.style || 'Sharp, composed court strategist',
                  },
                } as never,
                {
                  text: `${second.speaker}: ${second.text}`,
                  speechMetadata: {
                    speaker: second.speaker,
                    style: second.style || 'Curious, sharp-tongued apothecary prodigy',
                  },
                } as never,
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: first.speaker,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: first.voiceName || 'Charon' },
                    },
                  },
                  {
                    speaker: second.speaker,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: second.voiceName || 'Kore' },
                    },
                  },
                ],
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          res.status(502).json({ error: 'No audio data returned by gemini-3.8-flash-tts.' });
          return;
        }
        res.json({ audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
        return;
      }

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech generation.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: style || 'Dramatic wuxia fantasy narrator with poised cadence',
                },
              } as never,
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'No audio data returned by gemini-3.8-flash-tts.' });
        return;
      }
      res.json({ audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, hint: formatted.hint });
    }
  });

  // 2. Music Generation (lyria-3-clip-preview / lyria-3-pro-preview)
  app.post('/api/music', async (req, res) => {
    try {
      const { prompt, mode = 'clip', usePosterReference = false } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'A musical prompt is required.' });
        return;
      }

      const ai = getAiClient();
      const model = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      let contents: unknown = prompt.trim();
      if (usePosterReference) {
        const posterPath = path.resolve(
          __dirname,
          'public/assets/aistudio/Gemini_Generated_Image_ywxvhcywxvhcywxv_bc660a2b.jpg'
        );
        if (fs.existsSync(posterPath)) {
          const base64Poster = fs.readFileSync(posterPath).toString('base64');
          contents = {
            parts: [
              { text: prompt.trim() },
              { inlineData: { data: base64Poster, mimeType: 'image/jpeg' } },
            ],
          };
        }
      }

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: contents as never,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({ error: `No audio stream chunks returned by ${model}.` });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        model,
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim(),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, hint: formatted.hint });
    }
  });

  // 3. Create & Edit Images (gemini-nano-banana-2.1)
  app.post('/api/image/create-edit', async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = '16:9',
        imageSize = '1K',
        referenceImageBase64,
        referenceMimeType = 'image/jpeg',
        usePosterAsSource = false,
      } = req.body ?? {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'An image prompt is required.' });
        return;
      }

      const ai = getAiClient();
      const parts: Array<Record<string, unknown>> = [];

      if (referenceImageBase64 && typeof referenceImageBase64 === 'string') {
        const cleanBase64 = referenceImageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: referenceMimeType,
          },
        });
      } else if (usePosterAsSource) {
        const posterPath = path.resolve(
          __dirname,
          'public/assets/aistudio/Gemini_Generated_Image_ywxvhcywxvhcywxv_bc660a2b.jpg'
        );
        if (fs.existsSync(posterPath)) {
          parts.push({
            inlineData: {
              data: fs.readFileSync(posterPath).toString('base64'),
              mimeType: 'image/jpeg',
            },
          });
        }
      }

      parts.push({ text: prompt.trim() });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts: parts as never },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let notes = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'No image returned by gemini-nano-banana-2.1.', notes });
        return;
      }

      res.json({ model: 'gemini-nano-banana-2.1', imageUrl, notes: notes.trim() });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, hint: formatted.hint });
    }
  });

  // 4. High-Quality Image Generation (gemini-3-pro-image-preview with 1K / 2K / 4K)
  app.post('/api/image/hq', async (req, res) => {
    try {
      const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'An image prompt is required.' });
        return;
      }
      if (!['1K', '2K', '4K'].includes(imageSize)) {
        res.status(400).json({ error: 'imageSize must be 1K, 2K, or 4K.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt.trim() }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let notes = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'No image returned by gemini-3-pro-image-preview.', notes });
        return;
      }

      res.json({ model: 'gemini-3-pro-image-preview', imageSize, imageUrl, notes: notes.trim() });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, hint: formatted.hint });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shadows of the White Lady server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
