# UniPay SDK

Universal payment gateway SDK for Node.js that makes it easy to integrate multiple payment providers into your application.

## Installation

```bash
npm install @fiandev/unipay-sdk
```

## Usage

### CommonJS (CJS)
```javascript
const { Unipay, MidtransProvider } = require('@fiandev/unipay-sdk');
```

### ES Modules (ESM)
```javascript
import { Unipay, MidtransProvider } from '@fiandev/unipay-sdk';
```

### Basic Usage

```javascript
import { Unipay, MidtransProvider } from '@fiandev/unipay-sdk';

// Initialize with Midtrans provider
const unipay = new Unipay({
  provider: 'midtrans',
  config: {
    clientKey: 'your-client-key',
    serverKey: 'your-server-key',
    environment: 'sandbox' // or 'production'
  }
});

// Create a payment transaction
const payment = await unipay.createTransaction({
  orderId: 'ORDER-123',
  amount: 10000,
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  description: 'Test payment'
});

console.log(payment);
```

### Using Provider Factory

```javascript
import { ProviderFactory } from '@fiandev/unipay-sdk';

// Create a provider instance
const midtransProvider = ProviderFactory.create('midtrans', {
  clientKey: 'your-client-key',
  serverKey: 'your-server-key',
  environment: 'sandbox'
});

// Use the provider directly
const payment = await midtransProvider.createTransaction({
  orderId: 'ORDER-123',
  amount: 10000,
  customerEmail: 'customer@example.com'
});
```

## Supported Providers

- **Midtrans** - Fully supported
- **Doku** - Planned
- **Xendit** - Planned

## Development

### Installation
```bash
npm install
```

### Build
```bash
npm run build
```

### Testing

#### Unit Tests
Unit tests use mocked dependencies and can be run without any API credentials:

```bash
npm test
```

#### Integration Tests
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

## Publishing

This package is set up for automatic publishing to npm when a GitHub release is created. The CI/CD pipeline will:

1. Run tests on multiple Node.js versions
2. Build the package for both CJS and ESM
3. Publish to npm when a release is published

To publish a new version:
1. Update the version in `package.json` or use `npm version patch/minor/major`
2. Create a new GitHub release
3. The package will be automatically published to npm

## License

MIT
