Next.js

# Next.js

## Installation [Permalink for this section](https://react-tweet.vercel.app/next#installation)

> Next.js 13.2.1 or higher is required in order to use `react-tweet`.

Follow the [installation docs in the Introduction](https://react-tweet.vercel.app/#installation).

## Usage [Permalink for this section](https://react-tweet.vercel.app/next#usage)

In any component, import `Tweet` from `react-tweet` and use it like so:

```
import { Tweet } from 'react-tweet'

export default function Page() {
  return <Tweet id="1628832338187636740" />
}
```

`Tweet` works differently depending on where it's used. If it's used in the App Router it will fetch the tweet in the server. If it's used in the pages directory it will fetch the tweet in the client with [SWR (opens in a new tab)](https://swr.vercel.app/).

You can learn more about `Tweet` in the [Twitter theme docs](https://react-tweet.vercel.app/twitter-theme). And you can learn more about the usage in [Running the test app](https://react-tweet.vercel.app/next#running-the-test-app).

### Troubleshooting [Permalink for this section](https://react-tweet.vercel.app/next#troubleshooting)

If you see an error saying that CSS can't be imported from `node_modules` in the `pages` directory. Add the following config to `next.config.js`:

```
transpilePackages: ['react-tweet']
```

The error won't happen if the App Router is enabled, where [Next.js supports CSS imports from `node_modules` (opens in a new tab)](https://github.com/vercel/next.js/discussions/27953#discussioncomment-3978605).

### Enabling cache [Permalink for this section](https://react-tweet.vercel.app/next#enabling-cache)

It's recommended to enable cache for the Twitter API if you intend to go to production. This is how you can do it with [`unstable_cache` (opens in a new tab)](https://nextjs.org/docs/app/api-reference/functions/unstable_cache):

```
import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { TweetSkeleton, EmbeddedTweet, TweetNotFound } from 'react-tweet'
import { getTweet as _getTweet } from 'react-tweet/api'

const getTweet = unstable_cache(
  async (id: string) => _getTweet(id),
  ['tweet'],
  { revalidate: 3600 * 24 },
)

const TweetPage = async ({ id }: { id: string }) => {
  try {
    const tweet = await getTweet(id)
    return tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />
  } catch (error) {
    console.error(error)
    return <TweetNotFound error={error} />
  }
}

const Page = ({ params }: { params: { tweet: string } }) => (
  <Suspense fallback={<TweetSkeleton />}>
    <TweetPage id={params.tweet} />
  </Suspense>
)

export default Page
```

This can prevent getting your server IPs rate limited if they are making too many requests to the Twitter API.

## Advanced usage [Permalink for this section](https://react-tweet.vercel.app/next#advanced-usage)

### Manual data fetching [Permalink for this section](https://react-tweet.vercel.app/next#manual-data-fetching)

You can use the [`getTweet`](https://react-tweet.vercel.app/api-reference#gettweet) function from `react-tweet/api` to fetch the tweet manually. This is useful for SSG pages and for other [Next.js data fetching methods (opens in a new tab)](https://nextjs.org/docs/basic-features/data-fetching/overview) in the `pages` directory.

For example, using `getStaticProps` in `pages/[tweet].tsx` to fetch the tweet and send it as props to the page component:

```
import { useRouter } from 'next/router'
import { getTweet, type Tweet } from 'react-tweet/api'
import { EmbeddedTweet, TweetSkeleton } from 'react-tweet'

export async function getStaticProps({
  params,
}: {
  params: { tweet: string }
}) {
  const tweetId = params.tweet

  try {
    const tweet = await getTweet(tweetId)
    return tweet ? { props: { tweet } } : { notFound: true }
  } catch (error) {
    return { notFound: true }
  }
}

export async function getStaticPaths() {
  return { paths: [], fallback: true }
}

export default function Page({ tweet }: { tweet: Tweet }) {
  const { isFallback } = useRouter()
  return isFallback ? <TweetSkeleton /> : <EmbeddedTweet tweet={tweet} />
}
```

### Adding `next/image` [Permalink for this section](https://react-tweet.vercel.app/next#adding-nextimage)

Add the domain URLs from Twitter to [`images.remotePatterns` (opens in a new tab)](https://nextjs.org/docs/api-reference/next/image#remote-patterns) in `next.config.js`:

```
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [\
      { protocol: 'https', hostname: 'pbs.twimg.com' },\
      { protocol: 'https', hostname: 'abs.twimg.com' },\
    ],
  },
}
```

In `tweet-components.tsx` or elsewhere, import the `Image` component from `next/image` and use it to define custom image components for the tweet:

```
import Image from 'next/image'
import type { TwitterComponents } from 'react-tweet'

export const components: TwitterComponents = {
  AvatarImg: (props) => <Image {...props} />,
  MediaImg: (props) => <Image {...props} fill unoptimized />,
}
```

Then pass the `components` prop to `Tweet`:

```
import { Tweet } from 'react-tweet'
import { components } from './tweet-components'

export default function Page() {
  return <Tweet id="1628832338187636740" components={components} />
}
```

## Running the test app [Permalink for this section](https://react-tweet.vercel.app/next#running-the-test-app)

Clone the [`react-tweet` (opens in a new tab)](https://github.com/vercel/react-tweet) repository and then run the following command:

```
pnpm install && pnpm dev --filter=next-app...
```

The app will be up and running at [http://localhost:3001 (opens in a new tab)](http://localhost:3001/) for the [Next.js app example (opens in a new tab)](https://github.com/vercel/react-tweet/tree/main/apps/next-app).

The app shows the usage of `react-tweet` in different scenarios:

- [localhost:3001/light/1629307668568633344 (opens in a new tab)](http://localhost:3001/light/1629307668568633344) renders the tweet in the app router.
- [localhost:3001/dark/1629307668568633344 (opens in a new tab)](http://localhost:3001/dark/1629307668568633344) renders the tweet using SSG in the pages directory.
- [localhost:3001/light/mdx (opens in a new tab)](http://localhost:3001/light/mdx) rendes the tweet in MDX (with the experimental `mdxRs` config enabled).
- [localhost:3001/light/suspense/1629307668568633344 (opens in a new tab)](http://localhost:3001/light/suspense/1629307668568633344) renders the tweet with a custom `Suspense` wrapper.
- [localhost:3001/dark/swr/1629307668568633344 (opens in a new tab)](http://localhost:3001/dark/swr/1629307668568633344) uses `apiUrl` to change the API endpoint from which the tweet is fetched in SWR mode.
- [localhost:3001/light/cache/1629307668568633344 (opens in a new tab)](http://localhost:3001/light/suspense/1629307668568633344) renders the tweet while caching the tweet data with [`unstable_cache` (opens in a new tab)](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).
- [localhost:3001/light/vercel-kv/1629307668568633344 (opens in a new tab)](http://localhost:3001/light/suspense/1629307668568633344) renders the tweet while caching the tweet data with [Vercel KV (opens in a new tab)](https://vercel.com/docs/storage/vercel-kv).

The source code for `react-tweet` is imported from [packages/react-tweet (opens in a new tab)](https://github.com/vercel/react-tweet/tree/main/packages/react-tweet) and any changes you make to it will be reflected in the app immediately.

API Reference

# API Reference

This is the reference for the utility functions that `react-tweet` provides for [building your own tweet components](https://react-tweet.vercel.app/custom-theme) or simply fetching a tweet. Navigate to the docs for the [Twitter theme](https://react-tweet.vercel.app/twitter-theme) if you want to render the existing Tweet components instead.

## `getTweet` [Permalink for this section](https://react-tweet.vercel.app/api-reference#gettweet)

```
import { getTweet, type Tweet } from 'react-tweet/api'

function getTweet(
  id: string,
  fetchOptions?: RequestInit,
): Promise<Tweet | undefined>
```

Fetches and returns a [`Tweet` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/api/types/tweet.ts). It accepts the following params:

- **id** \- `string`: the tweet ID. For example in `https://twitter.com/chibicode/status/1629307668568633344` the tweet ID is `1629307668568633344`.
- **fetchOptions** \- `RequestInit` (Optional): options to pass to [`fetch` (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/API/fetch).

If a tweet is not found it returns `undefined`.

## `fetchTweet` [Permalink for this section](https://react-tweet.vercel.app/api-reference#fetchtweet)

```
function fetchTweet(
  id: string,
  fetchOptions?: RequestInit,
): Promise<{
  data?: Tweet | undefined
  tombstone?: true | undefined
  notFound?: true | undefined
}>
```

Fetches and returns a [`Tweet` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/api/types/tweet.ts) just like [`getTweet`](https://react-tweet.vercel.app/api-reference#gettweet), but it also returns additional information about the tweet:

- **data** \- `Tweet` (Optional): The tweet data.
- **tombstone** \- `true` (Optional): Indicates if the tweet has been made private.
- **notFound** \- `true` (Optional): Indicates if the tweet was not found.

## `enrichTweet` [Permalink for this section](https://react-tweet.vercel.app/api-reference#enrichtweet)

```
import { enrichTweet, type EnrichedTweet } from 'react-tweet'

const enrichTweet: (tweet: Tweet) => EnrichedTweet
```

Enriches a [`Tweet` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/api/types/tweet.ts) as returned by [`getTweet`](https://react-tweet.vercel.app/api-reference#gettweet) with additional data. This is useful to more easily build custom tweet components.

It returns an [`EnrichedTweet` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/utils.ts).

## `useTweet` [Permalink for this section](https://react-tweet.vercel.app/api-reference#usetweet)

> If your app supports React Server Components, use [`getTweet`](https://react-tweet.vercel.app/api-reference#gettweet) instead.

```
import { useTweet } from 'react-tweet'

const useTweet: (
  id?: string,
  apiUrl?: string,
  fetchOptions?: RequestInit,
) => {
  isLoading: boolean
  data: Tweet | null | undefined
  error: any
}
```

SWR hook for fetching a tweet in the browser. It accepts the following parameters:

- **id** \- `string`: the tweet ID. For example in `https://twitter.com/chibicode/status/1629307668568633344` the tweet ID is `1629307668568633344`. This parameter is not used if `apiUrl` is provided.
- **apiUrl** \- `string`: the API URL to fetch the tweet from. Defaults to `https://react-tweet.vercel.app/api/tweet/:id`.
- **fetchOptions** \- `RequestInit` (Optional): options to pass to [`fetch` (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/API/fetch). Try to pass down a reference to the same object to avoid unnecessary re-renders.

We highly recommend adding your own API endpoint in `apiUrl` for production:

```
const tweet = useTweet(null, id && `/api/tweet/${id}`)
```

It's likely you'll never use this hook directly, and `apiUrl` is passed as a prop to a component instead:

```
<Tweet apiUrl={id && `/api/tweet/${id}`} />
```

Or if the tweet component already knows about the endpoint it needs to use, you can use `id` instead:

```
<Tweet id={id} />
```

Twitter Theme

# Twitter Theme

This is the theme you'll see in [publish.twitter.com (opens in a new tab)](https://publish.twitter.com/?query=https%3A%2F%2Ftwitter.com%2FInterior%2Fstatus%2F463440424141459456&widget=Tweet) and the default theme included in `react-tweet`.

## Usage [Permalink for this section](https://react-tweet.vercel.app/twitter-theme#usage)

In any component, import `Tweet` from `react-tweet` and use it like so:

```
import { Tweet } from 'react-tweet'

export default function Page() {
  return <Tweet id="1628832338187636740" />
}
```

## Troubleshooting [Permalink for this section](https://react-tweet.vercel.app/twitter-theme#troubleshooting)

Currently, `react-tweet` uses CSS Modules to scope the CSS of each component, so the bundler where it's used needs to support CSS Modules. If you get issues about your bundler not recognizing CSS Modules, please open an issue as we would like to know how well supported this is.

[Twitter Theme](https://react-tweet.vercel.app/twitter-theme)

API Reference

## API Reference [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#api-reference)

### `Tweet` [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#tweet)

```
import { Tweet } from 'react-tweet'
```

```
<Tweet id="1629307668568633344">
```

Fetches and renders the tweet. It accepts the following props:

- **id** \- `string`: the tweet ID. For example in `https://twitter.com/chibicode/status/1629307668568633344` the tweet ID is `1629307668568633344`. This is the only required prop.
- **apiUrl** \- `string`: the API URL to fetch the tweet from when using the tweet client-side with SWR. Defaults to `https://react-tweet.vercel.app/api/tweet/:id`.
- **fallback** \- `ReactNode`: The fallback component to render while the tweet is loading. Defaults to `TweetSkeleton`.
- **onError** \- `(error?: any) => any`: The returned error will be sent to the `TweetNotFound` component.
- **components** \- `TwitterComponents`: Components to replace the default tweet components. See the [custom tweet components](https://react-tweet.vercel.app/twitter-theme/api-reference#custom-tweet-components) section for more details.
- **fetchOptions** \- `RequestInit`: options to pass to [`fetch` (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/API/fetch).

If the environment where `Tweet` is used does not support React Server Components then it will work with [SWR (opens in a new tab)](https://swr.vercel.app/) instead and the tweet will be fetched from `https://react-tweet.vercel.app/api/tweet/:id`, which is CORS friendly.

We highly recommend adding your own API route to fetch the tweet in production (as we cannot guarantee our IP will not get limited). You can do it by using the `apiUrl` prop:

```
<Tweet apiUrl={id && `/api/tweet/${id}`} />
```

> Note: `apiUrl` does nothing if the Tweet is rendered in a server component because it can fetch directly from Twitter's CDN.

Here's a good example of how to setup your own API route:

api/tweet/\[tweet\].ts

```
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTweet } from 'react-tweet/api'

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const tweetId = req.query.tweet

  if (req.method !== 'GET' || typeof tweetId !== 'string') {
    res.status(400).json({ error: 'Bad Request.' })
    return
  }

  try {
    const tweet = await getTweet(tweetId)
    res.status(tweet ? 200 : 404).json({ data: tweet ?? null })
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: error.message ?? 'Bad request.' })
  }
}

export default handler
```

Something similar can be done with Next.js API Routes or Route Handlers.

### `EmbeddedTweet` [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#embeddedtweet)

```
import { EmbeddedTweet } from 'react-tweet'
```

Renders a tweet. It accepts the following props:

- **tweet** \- `Tweet`: the tweet data, as returned by `getTweet`. Required.
- **components** \- `TwitterComponents`: Components to replace the default tweet components. See the [custom tweet components](https://react-tweet.vercel.app/twitter-theme/api-reference#custom-tweet-components) section for more details.

### `TweetSkeleton` [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#tweetskeleton)

```
import { TweetSkeleton } from 'react-tweet'
```

A tweet skeleton useful for loading states.

### `TweetNotFound` [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#tweetnotfound)

```
import { TweetNotFound } from 'react-tweet'
```

A tweet not found component. It accepts the following props:

- **error** \- `any`: the error that was thrown when fetching the tweet. Not required.

## Custom tweet components [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/api-reference#custom-tweet-components)

Default components used by [`Tweet`](https://react-tweet.vercel.app/twitter-theme/api-reference#tweet) and [`EmbeddedTweet`](https://react-tweet.vercel.app/twitter-theme/api-reference#embeddedtweet) can be replaced by passing a `components` prop. It extends the `TwitterComponents` type exported from `react-tweet`:

```
type TwitterComponents = {
  TweetNotFound?: (props: Props) => JSX.Element
  AvatarImg?: (props: AvatarImgProps) => JSX.Element
  MediaImg?: (props: MediaImgProps) => JSX.Element
}
```

For example, to replace the default `img` tag used for the avatar and media with `next/image` you can do the following:

```
// tweet-components.tsx
import Image from 'next/image'
import type { TwitterComponents } from 'react-tweet'

export const components: TwitterComponents = {
  AvatarImg: (props) => <Image {...props} />,
  MediaImg: (props) => <Image {...props} fill unoptimized />,
}
```

And then pass the components to `Tweet` or `EmbeddedTweet`:

```
import { components } from './tweet-components'

const MyTweet = ({ id }: { id: string }) => (
  <Tweet id={id} components={components} />
)
```

[Twitter Theme](https://react-tweet.vercel.app/twitter-theme)

Advanced

# Advanced

## Customizing the theme components [Permalink for this section](https://react-tweet.vercel.app/twitter-theme/advanced#customizing-the-theme-components)

The components used by the Twitter theme allow some simple [customization options](https://react-tweet.vercel.app/twitter-theme/api-reference#custom-tweet-components) for common use cases. However you can also have full control over the tweet by building your own `Tweet` component with the components and features of the theme that you would like to use.

For example, you can build your own tweet component but without the reply button like so:

my-tweet.tsx

```
import type { Tweet } from 'react-tweet/api'
import {
  type TwitterComponents,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetBody,
  TweetMedia,
  TweetInfo,
  TweetActions,
  QuotedTweet,
  enrichTweet,
} from 'react-tweet'

type Props = {
  tweet: Tweet
  components?: TwitterComponents
}

export const MyTweet = ({ tweet: t, components }: Props) => {
  const tweet = enrichTweet(t)
  return (
    <TweetContainer>
      <TweetHeader tweet={tweet} components={components} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet} />
      {tweet.mediaDetails?.length ? (
        <TweetMedia tweet={tweet} components={components} />
      ) : null}
      {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
      <TweetInfo tweet={tweet} />
      <TweetActions tweet={tweet} />
      {/* We're not including the `TweetReplies` component that adds the reply button */}
    </TweetContainer>
  )
}
```

Then, you can build your own `Tweet` component that uses the `MyTweet` component:

tweet.tsx

```
import { Suspense } from 'react'
import { getTweet } from 'react-tweet/api'
import { type TweetProps, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { MyTweet } from './my-tweet'

const TweetContent = async ({ id, components, onError }: TweetProps) => {
  const tweet = id
    ? await getTweet(id).catch((err) => {
        if (onError) {
          onError(err)
        } else {
          console.error(err)
        }
      })
    : undefined

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound
    return <NotFound />
  }

  return <MyTweet tweet={tweet} components={components} />
}

export const Tweet = ({
  fallback = <TweetSkeleton />,
  ...props
}: TweetProps) => (
  <Suspense fallback={fallback}>
    {/* @ts-ignore: Async components are valid in the app directory */}
    <TweetContent {...props} />
  </Suspense>
)
```

The `Tweet` component uses `Suspense` to progressively load the tweet (non-blocking rendering) and to opt-in into streaming if your framework supports it, like Next.js.

`TweetContent` is an async component that fetches the tweet and passes it to `MyTweet`. `async` only works for [React Server Components (RSC) (opens in a new tab)](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components) so if your framework does not support RSC you can use [SWR (opens in a new tab)](https://swr.vercel.app/) instead:

tweet.tsx

```
'use client'

import {
  type TweetProps,
  EmbeddedTweet,
  TweetNotFound,
  TweetSkeleton,
  useTweet,
} from 'react-tweet'

export const Tweet = ({
  id,
  apiUrl,
  fallback = <TweetSkeleton />,
  components,
  onError,
}: TweetProps) => {
  const { data, error, isLoading } = useTweet(id, apiUrl)

  if (isLoading) return fallback
  if (error || !data) {
    const NotFound = components?.TweetNotFound || TweetNotFound
    return <NotFound error={onError ? onError(error) : error} />
  }

  return <EmbeddedTweet tweet={data} components={components} />
}
```

Custom Theme

# Custom Theme

`react-tweet` exports multiple [utility functions](https://react-tweet.vercel.app/api-reference) to help you build your own theme if the default [Twitter theme](https://react-tweet.vercel.app/twitter-theme) and its customization options don't work for you or if you simply want to build your own.

To get started, we recommend using the [source for the Twitter theme (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/tweet.tsx) as the base and start customizing from there. Which more precisely is all of the components in the [`react-tweet` package (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet):

- [`src/tweet.tsx` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/tweet.tsx): Exports the async `Tweet` component that fetches the tweet data and renders the tweet. This is a [React Server Component (opens in a new tab)](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components).
- [`src/twitter-theme/*.tsx` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/twitter-theme): All the components that make up the theme.
- [`src/swr.tsx` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/swr.tsx): Exports the `Tweet` component but it uses [SWR (opens in a new tab)](https://swr.vercel.app/) to fetch the tweet client-side. This is useful if React Server Components are not supported by your React environment.

You can see a custom theme in action by looking at our [custom-tweet-dub (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/apps/custom-tweet-dub) example.

## Publishing your theme [Permalink for this section](https://react-tweet.vercel.app/custom-theme#publishing-your-theme)

We recommend you follow the same patterns of the Twitter theme before publishing your theme:

- Use the props defined by the `TweetProps` type in your Tweet component.
- Support the CSS theme features shown in [Toggling theme manually](https://react-tweet.vercel.app/#toggling-theme-manually). You can use the [`base.css` (opens in a new tab)](https://github.com/vercel/react-tweet/blob/main/packages/react-tweet/src/twitter-theme/theme.css) file from the Twitter theme as reference.
- Support both SWR and React Server Components as explained below.

When you use `react-tweet` we tell the builder which `Tweet` component to use with `exports` in `package.json`:

package.json

```
"exports": {
  ".": {
    "react-server": "./dist/index.js",
    "default": "./dist/index.client.js"
  }
},
```

> You can learn more about `react-server` in the [RFC for React Server Module Conventions V2 (opens in a new tab)](https://github.com/reactjs/rfcs/blob/main/text/0227-server-module-conventions.md#react-server-conditional-exports).

If the builder supports React Server Components, it will use the `react-server` export. Otherwise, it will use the `default` export.

Each export goes to a different file that exports the `Tweet` component. In this case `index.ts` exports a React Server Component and `index.client.ts` exports the `Tweet` component that uses SWR:

index.ts

```
export * from './twitter-theme/components.js'
export * from './tweet.js'
export * from './utils.js'
export * from './hooks.js'
```

index.client.ts

```
export * from './twitter-theme/components.js'
export * from './swr.js'
export * from './utils.js'
export * from './hooks.js'
```
