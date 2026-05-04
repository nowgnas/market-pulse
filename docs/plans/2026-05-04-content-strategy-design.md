# Content Strategy Design

## Decision

Shift Market Pulse from a high-frequency AI market-summary feed to a smaller, higher-trust content product:

- Publish one daily market explanation instead of three near-real-time briefings.
- Add recurring evergreen guide content that teaches readers how to interpret market data.
- Make every generated article explain a decision framework, not just restate news and index moves.
- Strengthen trust signals around AI usage, verification standards, sources, and contact.

## Why

The current site has the technical basics for AdSense review, but the content surface can still look like templated, AI-generated market summaries. More posts with the same structure would likely compound the problem. AdSense approval is more likely if the site shows durable user value: original framing, transparent editorial standards, and content that remains useful beyond the day it is published.

## Content Model

Daily content should become a single "market insight" post. It should identify the main driver of the day, connect it to specific data points, explain implications, include a counter-scenario, and give readers concrete checks they can perform themselves.

Evergreen content should cover reusable investor education topics such as:

- How to read KOSPI moves with exchange rates and foreign flows
- Why U.S. interest rates affect Korean growth stocks
- How semiconductor news flows into Korean market sentiment
- What to check during earnings season
- Morning, intraday, and closing market routines for busy readers

## Product Surface

The homepage should describe the new promise: fewer updates, more context. It should present daily insight and market guides as separate content pillars.

The about page should clarify:

- AI assists drafting and structuring.
- The site only publishes when content passes basic quality checks.
- Sources are public market data and linked news.
- Content is informational, not investment advice.
- Users can contact the operator.

## Implementation Scope

This design changes generation prompts, publishing cadence, labels, homepage copy, about-page trust copy, and internal docs. It does not introduce a CMS, manual approval dashboard, or new database schema in this pass.
