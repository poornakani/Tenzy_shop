# Tenzy Shop Admin + Supply Chain

This frontend now includes a dedicated cosmetic supply-chain workflow for:

- UK procurement with item-level discount capture
- UK-to-Sri-Lanka dispatch management
- Sri Lanka arrival verification
- Pricing approval from verified stock only
- Report filtering and PDF export

## Admin routes

- `/admin/procurement`
- `/admin/dispatch`
- `/admin/arrival`
- `/admin/pricing`
- `/admin/reports`

## Frontend setup

```bash
npm install
npm run dev
```

## Verification commands

```bash
npm run build
npm run test:supply-chain
```

To run the API smoke script, set credentials first:

```bash
export TENZY_API_BASE_URL="https://www.tenzyapitest.dotnetcloud.co.uk"
export TENZY_ADMIN_EMAIL="admin@example.com"
export TENZY_ADMIN_PASSWORD="your-password"
npm run test:supply-chain:api
```

## Backend companion changes

The backend migration and API implementation live in the sibling repo:

- `/Users/poornakanishka/TenzyBackend/Database/migrations/011_supply_chain_management.sql`
- `/Users/poornakanishka/TenzyBackend/TencyBackendApi/Controllers/SupplyChainController.cs`

See `/Users/poornakanishka/TenzyBackend/SUPPLY_CHAIN_SETUP.md` for schema and API notes.
