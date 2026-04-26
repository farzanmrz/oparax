# NOTES — Low-Priority Bugs & Feature Ideas

## Dashboard

- **Workflow list as table** — Dashboard currently shows workflows as stacked cards. Should be a proper table with columns (name, status, frequency, handles, last run) for better scanability at scale.

## Skills

- Simplify all editing skills to make wrap-up edit all files and keep git stuff separate from it

## Grok / xAI Experimentation

- **xAI sub-agent** — Create a Claude Code custom agent (`.claude/agents/`) specialized for
  writing xAI Grok code in OpenAI JS SDK format. The agent would have access to the xAI docs
  MCP server and know how to translate Python OpenAI SDK examples to JS. Useful once the
  x_search testing phase is complete and we're building more complex patterns.

- **Streaming reasoning tokens** — Currently we stream Grok's final output text, but the
  "Scanning X accounts..." spinner shows no intermediate progress. Could stream reasoning
  tokens and tool call events to show what Grok is doing (searching, thinking, etc.)
  like grok.com does. Low priority but nice UX improvement.

- **tool_choice observability** — Investigate whether `tool_choice` parameter affects
  server-side tools (x_search, web_search) or only client-side function calling tools.
  Also explore `server_side_tool_usage_details` in the response for deeper observability
  into which x_search internal strategies (keyword, semantic, user, thread) Grok is picking.
  This matters for understanding and optimizing retrieval quality.

- **x_search date filtering limitation** — `from_date`/`to_date` on the `x_search` tool
  are NOT reliably propagated to all sub-tools. `x_keyword_search` ignores them entirely
  (uses `mode: "Latest"` instead); only `x_semantic_search` picks up `from_date`. System
  prompt instructions help but don't fully enforce it. Needs further investigation — may
  require model-level filtering of results after retrieval.

- **Structured output for scan results** — Current approach returns free-form markdown that
  we parse with regex for `[[N]](url)` citations. Should switch to structured JSON output
  (array of headlines, each with tweet IDs). Eliminates regex fragility, handles null results
  cleanly (empty array instead of filler text), and enables relevance filtering at the schema level.

- **Prompt relevance filtering** — `sysprompt_scan` doesn't distinguish between direct news
  about a subject vs. adjacent/fan activity mentioning them. Example: "SRK fan club celebrates
  Veer-Zaara re-release" returned alongside actual SRK news. Prompt needs refinement to
  instruct Grok on relevance thresholds. Also currently Barca-specific in tone — needs
  generalizing for any topic.

- **OpenAI SDK property serialization** — Inline date expressions like
  `new Date(Date.now() - 24*60*60*1000).toISOString().split("T")[0]` passed directly in
  the tools config were silently dropped by the OpenAI SDK. Extracting to named constants
  first fixed it. Be cautious with complex expressions inside SDK request objects.

## New Notes

### Create Workflow Page

- FC Barca Static data locally and in production comes Pre-filled
- Message during search is Grok is searching instead of oparax change that
- The ordering of forms is also off arrange them accordingly. Workflow name with frequency then description then twitter accounts should come,
- Somehow need a way to cross-check whether the twitter account user is mentioning exists in real time and list them by partial string matching as user is typing. If possible then also try providing a list of accounts quickly matching user's goals
- Draft instructions come after this along with example tweets we can provide (check UI for example tweets that is also weird it should be text entry box)
- **Scanning UI and Logic**
  - Scanning should have progress indicator even better if rationale can be streamed
  - Scanning also doesnt remove previous scanned results when running a new scan with adjusted prompt on
    same new workflow page so that needs to get adjusted too, old scan results gotta get wiped when new scan is triggered.
  - Figure out if there is a limit to number of tweets its showing because for general prompt like 'I want all Bollywood news.' It should have showcased all tweets, but in a previous prompt, where I had put 'I want scandalous news about Bollywood celebrities', it had a tweet about Kiara Advani, which didn't appear in the general tweet prompt, so I'm confused if there is a limit to number of tweets its showing or its filtering logic is acting weird.
  - Look into making scanning more general with Grok 4.2 where one agent is going through accounts, other through web, others more generally across as per user instructions
- Maybe we try seeing how news in general is being aggregated by providing web search along as a tool
- Too much hodgepodge and excess info in scanned results with citation and sources etc. find a better UI to present it
  - URL appears next to tweet content that we are already displaying in embedded tweet so no point
  - The title and description below it seem similar, maybe we more closer to title UI just a bit but simply give description.
  - The source link being opened seperately is not needed for the tweet atleast because we are treating tweet as source for this therefore the source link on right is also needless
- The times on embedded tweets we have to show relative to user's local timezone cause even I am getting confused
- The react-tweet UI we need to correct its too large for the tweets embedded that are coming
- The saving button should also be with progress indication
- It should autonavigate to details page for that entry we just saved for new workflow in actuality the button just gets stuck at saving

### Login/Signup

- Somehow the previous my email ID comes pre-filled we gotta correct it
- The password form needs an eye thingy to view it
- Jazz up the autogenerated forgot password email with company branding and formatting
- Forgot password chain is still not working because when I tried to reset it these things happened after getting reset password email and clicking on link to reset
  - **First attempt to reset:** The new password setting page said some error occured when saving new password but didnt tell what. We have to know if it was due to password length constraints or something else
  - **Second attempt:** Worked and said succesfully reset password but back at login kept saying invalid email/password now we manually verified That the email did exist in our backend Supabase database, and we just reset the password, so I have no clue what happened. Even when I checked the Supabase logs, it said there was an error logging in.
- Forgot password fields also need eye button to view typed password
- After resetting password it should auto navigate back to sign in instead of us having to manually move it

### Listing page

- Need a data table with more fields to inform user of whats happening for now

### General

- UI needs a lot of work switch to light mode perhaps and work from there
- Determine what settings requires
- Sign in with Google etc. also needed and gotta figure out how to link the services
- Grok 4.2 experimentation might be worth it
- Cron job for scan frequency needs to be configured
