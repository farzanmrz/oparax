Here are the findings from checking the draft against the code, written in plain words with no em dashes.

### 1. Factual claims (right or wrong, and replacements)

Every factual claim about inputs, limits, thresholds, and X calls matches the code. The following claims are wrong:

**Finding 1 (UI layout)**
*   **Draft:** "The left column of every run page lists these 7 steps, and the log line under each step is the exact text the engine writes."
*   **Proof:** `components/one/run.tsx:137-139` (the steps are in the left column, but the log lines accumulate in a separate centre column).
*   **Replacement:** "The left column of every run page lists these 7 steps, and the centre column accumulates the log lines and blocks top to bottom as the exact text the engine writes."

**Finding 2 (Jev requests before the fix)**
*   **Draft:** "After the October 8 fix, that is 3 requests instead of 1, each carrying only its own candidates."
*   **Proof:** `lib/ai/jev.ts:41` and `lib/onboarding/engine.ts:337`. Before the fix, Jev already batched the 156 questions into groups of 60, making 3 requests anyway. All 3 failed because each carried the full state.
*   **Replacement:** "After the October 8 fix, that is still 3 requests, but each carrying only its own candidates."

**Finding 3 (Messages to Luna)**
*   **Draft:** "GPT-6 Luna Fast gets 1 message: the beat, the profile..."
*   **Proof:** `lib/onboarding/engine.ts:550` (it sends a system message and a user message).
*   **Replacement:** "GPT-6 Luna Fast gets 2 messages: the instructions prompt as a system message, and a user message with the beat, the profile with bio and pinned post, the 10 posts with their pictures attached, and only the candidates that passed, highest score first, with their scores."

**Finding 4 (Checkpoints saved)**
*   **Draft:** "Checkpoints: the engine saves build_state after the profile, the posts, the scores and the answer"
*   **Proof:** `lib/onboarding/engine.ts:405, 618` (it also saves after timeline pages, the search result, and the search scores).
*   **Replacement:** "Checkpoints: the engine saves build_state after each timeline page, the posts, the scores, the first answer, the search result, the search scores, and the final answer; the page polls every 3 seconds and renders only what lib/onboarding/read.ts projects (bands, pills, log lines, profile, posts); scores never reach the browser."

### 2. What the draft omits (input, output, reasoning, tool use)

*   **Input (Images):** The pages do not show that the model receives images. This happens in `lib/onboarding/engine.ts:268` where media tags are converted into image objects. To understand this, the owner would need to see the raw array of text and image objects sent in the user message.
*   **Output (Structured JSON):** The pages do not show how the model structures its answer. This happens in `lib/onboarding/engine.ts:569` via Zod schemas. To understand this, the owner would need to see `AnswerSchema` in `lib/onboarding/types.ts:39` and a raw JSON string returned by the model.
*   **Reasoning:** The pages do not show the model's thinking. This happens in `lib/onboarding/engine.ts:570` where reasoning effort is set to high. The reasoning tokens are discarded by the code. To understand it, the owner would need to look at the AI provider dashboard or log the reasoning tokens directly.
*   **Tool use (None):** The pages do not show tool use because there are no tools. The search is handled in `lib/onboarding/engine.ts:608` by a text field in the JSON answer. To understand this, the owner would need to see that no tools array is passed and that the code manually triggers the search using that JSON field.

### 3. Mapping of steps to pages and checkpoints

The draft correctly maps the right column to `run?at=profile` and the newest posts to `run?at=posts`, as those checkpoints populate the profile and posts states. However, two things are tied differently:
*   **The "Gathering candidates" block** shows as running at `run?at=posts`, because the gather phase is not done yet. At `run?at=scoring`, gathering is complete and Jev scoring is actively running with an amber line.
*   **The search line** is tied to a log line, not a checkpoint state. It renders immediately when the engine logs the search text (`lib/onboarding/phases.ts:48`), before the search result checkpoint is even saved.

### 4. The bug paragraph

*   **Accurate?** Mostly, but the claim that there was 1 request before the fix is wrong. Jev batched questions by 60, so 156 candidates already caused 3 requests.
*   **Where it exceeded:** The state exceeded the 32,000 token limit exactly at `lib/ai/jev.ts:60` where the JSON length of the state and questions is checked before sending to the gateway.
*   **Are "3 requests" right after the fix?** Yes. The 150 table rows plus quoted accounts yield about 120,000 characters in JSON. The engine splits this at 48,000 characters (24,000 estimated tokens), resulting in 3 chunks. Each chunk has about 52 questions, which avoids Jev's 60 batch limit, totaling exactly 3 requests to the gateway.

### 5. What would mislead a reader

*   The draft says the log line sits "under each step" in the left column. This misleads the reader into thinking the UI is a nested list. The 7 steps are in a left sidebar, while the stream of log lines and blocks accumulates in the wide centre column.
*   The draft implies Jev asks "1 question per candidate" individually. This might mislead readers into thinking it makes 150 separate API calls instead of batching them. 
*   The draft says Luna answers with "search null" like a tool command, which obscures the fact that it is just fulfilling a normal JSON property in a structured output.