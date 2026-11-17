import React, { useState } from 'react';

interface ImperialAtelierModalProps {
  onClose: () => void;
}

type AtelierTab = 'music' | 'image-edit' | 'image-hq' | 'tts';

interface ApiErrorState {
  message: string;
  hint?: string;
}

export const ImperialAtelierModal: React.FC<ImperialAtelierModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<AtelierTab>('music');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorState | null>(null);

  // Music state (lyria-3-clip-preview / lyria-3-pro-preview)
  const [musicPrompt, setMusicPrompt] = useState(
    'Epic cinematic wuxia fantasy courtyard battle theme with guzheng, bamboo dizi flute, taiko war drums, and ethereal choir.'
  );
  const [musicMode, setMusicMode] = useState<'clip' | 'pro'>('clip');
  const [musicUsePoster, setMusicUsePoster] = useState(true);
  const [musicResult, setMusicResult] = useState<{ audioDataUrl: string; lyrics: string; model: string } | null>(null);

  // Create & Edit Image state (gemini-nano-banana-2.1)
  const [editPrompt, setEditPrompt] = useState(
    'Reimagine this imperial courtyard duel under a luminous emerald aurora with glowing lotus runes swirling around the three heroes.'
  );
  const [editAspectRatio, setEditAspectRatio] = useState('16:9');
  const [usePosterSource, setUsePosterSource] = useState(true);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string>('image/jpeg');
  const [editResult, setEditResult] = useState<{ imageUrl: string; notes: string } | null>(null);

  // High-Quality Image Generation state (gemini-3-pro-image-preview with 1K, 2K, 4K)
  const [hqPrompt, setHqPrompt] = useState(
    'Epic 3D wuxia fantasy key art poster of three rune-infused apothecary heroes battling shadow assassins beneath a floating frost empress in a lantern-lit cherry blossom courtyard.'
  );
  const [hqSize, setHqSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [hqAspect, setHqAspect] = useState('16:9');
  const [hqResult, setHqResult] = useState<{ imageUrl: string; imageSize: string } | null>(null);

  // TTS state (gemini-3.8-flash-tts)
  const [ttsMode, setTtsMode] = useState<'single' | 'dual'>('single');
  const [ttsText, setTtsText] = useState(
    'Step carefully through the lantern mist. Every poison hides its own cure, and tonight the White Lady shall yield the Elixir of Immunity.'
  );
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [ttsStyle, setTtsStyle] = useState('Poised, mysterious wuxia apothecary narrator');
  const [dualLine1, setDualLine1] = useState('Her frost ward draws power from the courtyard shadows. Seal the flanks!');
  const [dualLine2, setDualLine2] = useState('|mhm| Agreed—one emerald vial should break her miasma right open.');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBase64(reader.result);
        setUsePosterSource(false);
      }
    };
    reader.readAsDataURL(file);
  };

  async function callAtelierEndpoint<T>(url: string, payload: Record<string, unknown>): Promise<T | null> {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError({
          message: data.error || `Request failed (${resp.status})`,
          hint: data.hint,
        });
        return null;
      }
      return data as T;
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Network error calling server API.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 9, 18, 0.88)' }}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-400/45 p-6"
        style={{ backgroundColor: 'rgba(12, 17, 32, 0.98)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="font-hanzi text-xs tracking-widest text-amber-300">天工寶閣 · IMPERIAL ATELIER</span>
            <h2 className="font-wuxia text-2xl font-bold text-white">
              Soundtrack, Concept Art &amp; Voice Studio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Imperial Atelier"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3 mb-5">
          {[
            { id: 'music' as const, label: 'Music (Lyria)' },
            { id: 'image-edit' as const, label: 'Create & Edit Art' },
            { id: 'image-hq' as const, label: 'HQ Poster (1K–4K)' },
            { id: 'tts' as const, label: 'Voice TTS' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setError(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-wuxia font-bold cursor-pointer border ${
                tab === t.id
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/90 border border-rose-400/50 text-rose-100 text-xs space-y-1">
            <div className="font-bold">{error.message}</div>
            {error.hint && <div className="text-rose-200/90">{error.hint}</div>}
          </div>
        )}

        {/* TAB 1: MUSIC GENERATION (lyria-3-clip-preview / lyria-3-pro-preview) */}
        {tab === 'music' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Track Format</label>
                <select
                  value={musicMode}
                  onChange={(e) => setMusicMode(e.target.value as 'clip' | 'pro')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  <option value="clip">30s Action Clip (lyria-3-clip-preview)</option>
                  <option value="pro">Full-Length Score (lyria-3-pro-preview)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={musicUsePoster}
                    onChange={(e) => setMusicUsePoster(e.target.checked)}
                    className="rounded"
                  />
                  Inspire mood from Courtyard Key Art Poster
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">Musical Prompt</label>
              <textarea
                rows={3}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const res = await callAtelierEndpoint<{ audioDataUrl: string; lyrics: string; model: string }>(
                  '/api/music',
                  { prompt: musicPrompt, mode: musicMode, usePosterReference: musicUsePoster }
                );
                if (res) setMusicResult(res);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-wuxia font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Composing Wuxia Score...' : 'Generate Soundtrack'}
            </button>

            {musicResult && (
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-400/40 space-y-2">
                <div className="text-xs text-emerald-300 font-semibold">Generated with {musicResult.model}</div>
                <audio controls src={musicResult.audioDataUrl} className="w-full" />
                {musicResult.lyrics && (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap pt-2 border-t border-slate-800">
                    {musicResult.lyrics}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE & EDIT IMAGES (gemini-nano-banana-2.1) */}
        {tab === 'image-edit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Aspect Ratio</label>
                <select
                  value={editAspectRatio}
                  onChange={(e) => setEditAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  <option value="16:9">16:9 Widescreen</option>
                  <option value="9:16">9:16 Poster</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="3:4">3:4 Portrait</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Optional Reference Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-cyan-200"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={usePosterSource}
                onChange={(e) => {
                  setUsePosterSource(e.target.checked);
                  if (e.target.checked) setUploadedBase64(null);
                }}
              />
              Edit directly from the Courtyard Concept Art Poster
            </label>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">
                Create or Edit Prompt (gemini-nano-banana-2.1)
              </label>
              <textarea
                rows={3}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const res = await callAtelierEndpoint<{ imageUrl: string; notes: string }>(
                  '/api/image/create-edit',
                  {
                    prompt: editPrompt,
                    aspectRatio: editAspectRatio,
                    usePosterAsSource: usePosterSource,
                    referenceImageBase64: uploadedBase64,
                    referenceMimeType: uploadedMime,
                  }
                );
                if (res) setEditResult(res);
              }}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-wuxia font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Painting Concept Art...' : 'Create / Edit Image'}
            </button>

            {editResult && (
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-400/40 space-y-2">
                <img src={editResult.imageUrl} alt="Generated Wuxia Art" className="w-full rounded-lg" />
                {editResult.notes && <p className="text-xs text-slate-300">{editResult.notes}</p>}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HIGH-QUALITY IMAGE GENERATION (gemini-3-pro-image-preview with 1K / 2K / 4K) */}
        {tab === 'image-hq' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Resolution Size (1K / 2K / 4K)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setHqSize(sz)}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        hqSize === sz
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Aspect Ratio</label>
                <select
                  value={hqAspect}
                  onChange={(e) => setHqAspect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  <option value="16:9">16:9 Wallpaper</option>
                  <option value="9:16">9:16 Vertical Poster</option>
                  <option value="3:4">3:4 Collector Print</option>
                  <option value="1:1">1:1 Emblem</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">
                High-Quality Poster Prompt (gemini-3-pro-image-preview)
              </label>
              <textarea
                rows={3}
                value={hqPrompt}
                onChange={(e) => setHqPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const res = await callAtelierEndpoint<{ imageUrl: string; imageSize: string }>('/api/image/hq', {
                  prompt: hqPrompt,
                  imageSize: hqSize,
                  aspectRatio: hqAspect,
                });
                if (res) setHqResult(res);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-wuxia font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? `Rendering ${hqSize} Poster...` : `Generate ${hqSize} High-Quality Poster`}
            </button>

            {hqResult && (
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-400/40 space-y-2">
                <div className="text-xs text-amber-300 font-semibold">
                  Rendered at {hqResult.imageSize} via gemini-3-pro-image-preview
                </div>
                <img src={hqResult.imageUrl} alt="High Quality Poster" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TEXT-TO-SPEECH (gemini-3.8-flash-tts) */}
        {tab === 'tts' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTtsMode('single')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  ttsMode === 'single'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                Single Narrator
              </button>
              <button
                type="button"
                onClick={() => setTtsMode('dual')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  ttsMode === 'dual'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                Squad Banter (2 Speakers)
              </button>
            </div>

            {ttsMode === 'single' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Voice Persona</label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="Kore">Kore (Poised Herbalist)</option>
                      <option value="Charon">Charon (Court Strategist)</option>
                      <option value="Zephyr">Zephyr (Lotus Tactician)</option>
                      <option value="Fenrir">Fenrir (Shadow Assassin)</option>
                      <option value="Puck">Puck (Quick-Witted Scout)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Delivery Style</label>
                    <input
                      type="text"
                      value={ttsStyle}
                      onChange={(e) => setTtsStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    Chronicle Script (gemini-3.8-flash-tts)
                  </label>
                  <textarea
                    rows={3}
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-cyan-300 font-semibold mb-1">Jinka (Court Strategist)</label>
                  <input
                    type="text"
                    value={dualLine1}
                    onChange={(e) => setDualLine1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-300 font-semibold mb-1">
                    Maomi (Poison-Tasting Herbalist)
                  </label>
                  <input
                    type="text"
                    value={dualLine2}
                    onChange={(e) => setDualLine2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const payload =
                  ttsMode === 'single'
                    ? { mode: 'single', text: ttsText, voiceName: ttsVoice, style: ttsStyle }
                    : {
                        mode: 'dual',
                        dialogue: [
                          {
                            speaker: 'Jinka',
                            text: dualLine1,
                            voiceName: 'Charon',
                            style: 'Calm, tactical imperial court strategist',
                          },
                          {
                            speaker: 'Maomi',
                            text: dualLine2,
                            voiceName: 'Kore',
                            style: 'Clever, sharp-tongued young herbalist',
                          },
                        ],
                      };
                const res = await callAtelierEndpoint<{ audioDataUrl: string }>('/api/tts', payload);
                if (res) setTtsAudioUrl(res.audioDataUrl);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-wuxia font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Synthesizing Voice...' : 'Speak Line (gemini-3.8-flash-tts)'}
            </button>

            {ttsAudioUrl && (
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-400/40">
                <audio controls autoPlay src={ttsAudioUrl} className="w-full" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
