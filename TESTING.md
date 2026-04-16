# NLMusic MVP — Testing Checklist

## E2E Test Flow (Local)

### Setup
```bash
npm run dev
# Should start at http://localhost:3000
```

### Test 1: UI loads without errors
- [ ] Open http://localhost:3000
- [ ] No console errors
- [ ] See title "NLMusic" + subtitle
- [ ] BeatCursor visible (16 dots, animating)
- [ ] PlaybackControls visible (Play/Stop buttons)
- [ ] Sequencer visible (3 tracks: Kick, Snare, Hi-Hat)
- [ ] PromptBox visible (text input + Generar button)

### Test 2: State persistence (Zustand + localStorage)
- [ ] Reload page (F5)
- [ ] State should persist (same tracks, BPM)
- [ ] localStorage shows "nlmusic-session" entry in DevTools

### Test 3: Prompt → API → Store flow
- [ ] Enter prompt: "kick 909 en 4x4 techno"
- [ ] Click "Generar" button
- [ ] Spinner should appear
- [ ] Wait for response (< 10s with Sonnet)
- [ ] Sequencer should update with new pattern
- [ ] No error message

### Test 4: Strudel runtime initialization
- [ ] Open browser DevTools → Console
- [ ] Should see "[Strudel] Initialized from CDN" or timeout message
- [ ] PlaybackControls should enable Play/Stop buttons

### Test 5: Play/Stop controls
- [ ] Click "Play" button
- [ ] Console should log "[Strudel] Playing pattern"
- [ ] Button should change state visually
- [ ] Audio should play (if Strudel API fully loaded)
- [ ] Click "Stop" button
- [ ] Console should log "[Strudel] Stopped"
- [ ] Button state should revert

### Test 6: Sequencer interaction
- [ ] Click any step in a track to toggle
- [ ] Sequencer grid should update visually
- [ ] Mute/Solo buttons should toggle track state
- [ ] Volume fader should adjust (0-100%)

### Test 7: Multiple iterations
- [ ] Send another prompt
- [ ] Previous state should update
- [ ] BeatCursor should keep animating
- [ ] Play state should reset to stopped

### Test 8: Error handling
- [ ] Try empty prompt: should show validation error
- [ ] Try without ANTHROPIC_API_KEY: should show 500 error
- [ ] Try invalid LLM response: should fallback to default pattern

---

## API Endpoint Test

```bash
# Test POST /api/generate-pattern directly
curl -X POST http://localhost:3000/api/generate-pattern \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "bombo grave oscuro",
    "context": { "turns": [], "language": "es" }
  }'

# Expected response:
# { "success": true, "trackJson": { "bpm": ..., "tracks": [...] } }
# OR
# { "success": false, "trackJson": {...}, "usedFallback": true, "error": "..." }
```

---

## Browser DevTools Checks

### Console
- [ ] No JavaScript errors (red X)
- [ ] Warning about Next.js workspace is OK
- [ ] See Strudel initialization logs

### Network
- [ ] `/api/generate-pattern` POST succeeds (200 or 201)
- [ ] Response includes `trackJson` object
- [ ] Strudel CDN script loads (check scripts in Sources)

### Storage
- [ ] Application → Local Storage
- [ ] Entry "nlmusic-session" exists with session state

---

## Performance Baselines (MVP OK if)
- [ ] LLM response time: < 15s
- [ ] UI interaction (click step): < 100ms latency
- [ ] BeatCursor animation: smooth (60 FPS)
- [ ] No memory leaks: heap stable after 10 iterations

---

## Known Limitations (v0.1)
- Strudel CDN may take time to load (fallback mode tolerates this)
- BeatCursor animation is client-side simulation (not synced to real audio clock yet)
- No real-time code editing view (v1 feature)
- Export/share not implemented (v1 feature)
