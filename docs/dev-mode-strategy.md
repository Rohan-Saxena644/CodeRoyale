# Dev Mode Strategy

## Recommendation

Lead dev mode with starter-code debugging challenges.

That gives CodeRoyale a stronger identity than MCQ-only rounds because it tests actual engineering judgment:

- reading unfamiliar code
- spotting the bug
- applying the fix
- proving the fix through assertions

## Why not MCQ-only first

MCQs are easier to generate, but they are a weaker duel loop because:

- they reward recognition more than execution
- they are easier to game
- they feel less satisfying in a live 1v1 format
- category depth becomes a content treadmill very quickly

## Best launch order

1. React UI bug-fix challenges
2. Express API bug-fix challenges
3. Go backend bug-fix challenges
4. Rust backend bug-fix challenges
5. Optional MCQ packs for system design, networking, or interview prep

## Example dev categories

- `react-ui`: broken component, DOM assertions, preview iframe
- `express-api`: broken route or middleware, HTTP assertions
- `go-backend`: logic or handler bug, CLI or HTTP assertions
- `rust-backend`: parsing or service bug, CLI or HTTP assertions
- `next-actions`: broken server action or form flow, integration assertions

## Content generation rule

For both competitive and dev mode, generated prompts should be original or based on clearly permissive material. Avoid copying from copyrighted premium question banks.
