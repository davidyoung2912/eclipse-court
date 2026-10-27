# Online play: two players, peer to peer over WebRTC, no game server

**Status: N1 to N3 done; N4 to N6 not started.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing (so the WebRTC glue is kept thin and the protocol is tested over a loopback transport).

## Decisions
- **No backend.** A WebRTC `RTCDataChannel` carries the moves. Signaling (swapping the SDP offer/answer) is done by hand: the host shows a code or link, the guest pastes an answer code back. STUN only, using public servers. No TURN, so a minority of pairs behind symmetric NATs or corporate networks cannot connect; the lobby says so plainly and suggests another network.
- **Everything sits behind a `Transport` interface** (`send`, `onMessage`, `onClose`). WebRTC is one implementation, a loopback pair is another (tests), and a PeerJS-style broker or a small Worker signaler can be added later without touching the game.
- **Moves only.** Both peers run the same deterministic engine from the same `MatchConfig`; only actions are sent. Each peer applies a received action with `reduce` and refuses it if the rules do (`reduce` returns the same state), so an illegal move cannot be forced on anyone. A running checksum of the state after each action is sent with it, so a desync is caught at once.
- **Duels are settled by the deterministic `autoDuel`** at `AUTO_DUEL_SKILL` on both sides, seeded from `state.rng + state.round` (as hot-seat does). The mover includes the `duel` outcome in the action, and the receiver recomputes it and rejects a mismatch. No live duels online in v1: a live duel steers one fighter, and trusting the attacker's reported result would let them cheat. A lockstep live duel is an optional last phase.
- **Perfect information, so no hidden state to protect.** Nothing in the game is secret; the only trust issue is illegal moves and forged duel results, both checked by the receiver.
- **Host picks the match** (a `Challenge`: config and the court the guest takes). The host is not authoritative afterwards; both sides validate.
- **Disabled online:** undo, hints, the pass screen, puzzles and campaign progress. Turn clocks (Blitz) run on each player's own device and a timeout sends a `pass`, so the clock is advisory; the receiver does not enforce it.
- **Privacy note:** a WebRTC connection exposes each player's IP to the other and to the STUN server. The lobby says so. The build's CSP has no WebRTC directive, so `connect-src 'self'` does not block it; only a future WebSocket signaler would need the CSP extended.

## Wire protocol (N1)
JSON messages, one per data-channel message, each tagged with a protocol version `v`:
- `hello { v, name?, formatVersion }`: first message each way. A mismatch of `v` or the share-code format version ends the session with a clear reason.
- `start { challenge code }`: host to guest, the match to play. The guest replies `ready`.
- `act { n, action, sum }`: action number `n` (0-based, must equal the count of actions played), the action packed as in `serialize.ts`, and `sum`, a checksum of the state after it.
- `resign`, `bye`.
- `sync { record code }` (N5): resend the whole game after a reconnect.

`Session` (pure, no DOM) holds the `GameState`, the local court and the action count. It refuses: an action out of turn, a wrong `n`, a rules refusal, a duel mismatch, a checksum mismatch. Refusals end the game as a desync rather than guessing.

## Phases
- **N1 (done): protocol and session over an abstract transport (no UI, no WebRTC).** `src/net/`: `transport.ts` (interface and the loopback pair), `protocol.ts` (message types, encode and validate, checksum), `session.ts` (host and guest sides, applying and verifying actions, duel recomputation), with tests over the loopback: a full scripted game both sides agree on, rejection of an illegal move, a forged duel, a bad `n`, a tampered checksum, a version mismatch, resign and close.
- **N2 (done): WebRTC transport and manual signaling.** `rtc.ts` wraps `RTCPeerConnection` and one data channel with public STUN, waits for ICE gathering to finish, and produces a single offer or answer blob. `signal.ts` squeezes the SDP into a short URL-safe code (keep ufrag, pwd, fingerprint and candidates; drop the rest) and rebuilds it, with round-trip tests on sample SDP. Links of the form `#j=<offer>` open the guest flow.
- **N3 (done): lobby UI.** A Battle menu entry "Play online": host (pick the match with the Skirmish controls, show a code, link and QR-style copy button, paste the answer) or join (paste or open a link, show the answer code to send back). Connection states, a timeout, and a clear failed-to-connect message that explains the NAT limitation.
- **N4: Game integration.** An `online` controller kind next to `human` and AI, so `Game` plays the remote court by feeding received actions through `play`, and sends the local court's actions. The turn banner, board orientation (your court at the bottom), auto-duel for captures with the result dialog, spells, growth choices (perk and promotion travel inside the move), and the game-over flow. Undo, hint and pass screen are hidden online. Saved games and stats record online games separately or not at all (decide here).
- **N5: resilience.** Disconnect detection (heartbeat), a reconnect flow that re-handshakes and resyncs from a record code and checks both sides agree, resign and "leave" messages, an opponent-left banner, and desync reporting with a copyable record for bug reports.
- **N6 (optional): easier signaling and live duels.** A pluggable signaler (a short room code through PeerJS's public broker or a small Worker) so joining is one step, and, if wanted, a lockstep live duel where both peers exchange inputs per tick against the deterministic duel engine.

## Open questions
- Whether online games count toward stars, stats and the daily streak (leaning: no, they are just games).
- Whether to show a rematch button that swaps courts (leaning: yes, cheap once N4 exists).

## N1 notes
- Files in `src/net/`: `transport.ts` (`Transport`, `loopbackPair` with async in-order delivery and buffering until a handler is set), `protocol.ts` (messages, `decodeMessage`, `stateSum`, a canonical-JSON FNV-1a checksum), `session.ts` (`createSession`, `settleDuel`), `session.test.ts` (23 tests). `pack` and `unpack` in `serialize.ts` are now exported for the wire format.
- `createSession({ transport, role, challenge?, onChange? })` returns `{ view, play, resign, close }`. `view()` gives `status` (connecting, playing, over), `reason`, `me`, `challenge`, `state`, `actions` and `winner`. The host owns the challenge (`side` is the guest's court) and sends `start` once the guest's `hello` checks out; the guest builds the game from `start` and replies `ready`.
- `settleDuel(state, action)` is the one place online duels are computed: `autoDuel` at `AUTO_DUEL_SKILL` for both fighters, aggression 1/1, seed `state.rng + state.round`, the same arguments as hot-seat. `play` overwrites any caller-supplied duel with it; the receiver requires an exact match (and no duel on a non-capture), else `illegal`.
- Failures (`version`, `protocol`, `illegal`, `desync`) close the transport; `finished`, either resignation and `closed` leave it alone.
- Not done, by design: the guest accepts any valid challenge (N3 adds an accept step before `ready` if wanted), no reconnect or heartbeat (N5), no clock enforcement.

## N2 notes
- `signal.ts` (pure): `parseSdp` keeps ufrag, pwd, sha-256 fingerprint and UDP candidates (TCP dropped); `buildSdp` rebuilds a data-channel SDP from a fixed template (offer is `actpass`, answer `active`); `encodeSignal`/`decodeSignal` make a version-prefixed (`1`) base64url code; `decodeSignal` also accepts a whole `#j=` link or a code with stray whitespace; `joinLink(base, code)` builds the share link. 6 tests in `signal.test.ts`.
- `rtc.ts` (untested glue): `hostOffer()` gives `{ code, accept(answerCode) -> Transport, cancel }`; `guestAnswer(offerCode)` gives `{ code, connected: Promise<Transport>, cancel }`; `rtcSupported()`. Two public STUN servers, ICE gathering waits up to 4 s. The wrapped `Transport` buffers messages until a handler is set and reports close on channel close or a failed/closed connection.

## N3 notes
- Battle menu has "Play Online" -> `Online.tsx` (Host / Join, disabled without `rtcSupported()`). Host opens Skirmish with an "Online" Players option (`onHost`; like hot seat it bars drafts and loadouts, hides Share and the AI picker, keeps the court choice) and then `Lobby`. Join opens `Lobby` with a paste box.
- `Lobby.tsx`: host shows the offer code (copy, share link) and takes the answer; guest pastes the offer, shows the answer code and waits. Both then run `createSession`; the lobby shows the match and court once connected. `#j=` links open the guest lobby prefilled (`takeLinkScreen`).
- `timeout.ts`: `withTimeout` (tested), `CONNECT_MS` (45 s host, 90 s guest wait), and `NAT_HELP` text shown on any failure. Leaving cancels the pending connection and closes the session.
- Not yet: the lobby stops at "connected"; N4 starts the game from the session.
