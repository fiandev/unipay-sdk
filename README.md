# unipay-sdk

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Testing

### Unit Tests
Unit tests use mocked dependencies and can be run without any API credentials:

```bash
npm test
```

### Integration Tests
Integration tests require real Midtrans API credentials. To run them:

1. Set up your environment variables:
```bash
cp .env.example .env
# Edit .env with your Midtrans credentials
```

2. Run the tests:
```bash
npm test -- tests/integration/
```

The integration tests will be skipped automatically if credentials are not provided.

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
