# Mint Frontend

A modern, open-source personal finance dashboard built with React and TypeScript.

Mint Frontend is the web interface for **Mint Alternative**, a personal finance platform inspired by the original Mint application. The goal is to make managing accounts, tracking spending, creating budgets, and understanding personal finances simple and accessible.

The application is designed to be responsive, mobile-friendly, and eventually installable as a Progressive Web App (PWA).

> **Project Status:** Early development. Features and integrations are being implemented incrementally.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend framework |
| TypeScript | Type-safe development |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling and responsive design |
| shadcn/ui | Reusable UI components |
| Recharts | Financial charts and visualizations |
| TanStack Query | API data fetching and caching |
| React Router | Client-side routing |
| vite-plugin-pwa | Planned PWA support |

## Planned Features

### Dashboard

- Overview of connected financial accounts
- Total assets, liabilities, and net worth
- Monthly income and expenses
- Spending trends and category breakdowns
- Recent transactions and financial activity

### Accounts

- Checking and savings accounts
- Credit cards and loans
- Investment accounts
- Manual account management
- Account balance history

### Transactions

- Searchable and filterable transaction history
- Transaction categorization
- Custom categories and merchant rules
- Manual transaction entry
- Recurring transaction identification

### Budgets

- Monthly and category-based budgets
- Budget utilization and remaining balances
- Spending progress indicators
- Historical budget comparisons

### Financial Insights

- Income and expense trends
- Net worth tracking
- Spending breakdowns
- Savings goals and debt repayment progress

### Mobile Experience

The frontend will prioritize responsive layouts and mobile usability.

Planned PWA capabilities include home-screen installation, app-like navigation, and appropriate offline support.

## Architecture

The frontend communicates with a separate Go backend through a REST API.

```text
                   Mint Frontend
                React + TypeScript
                        |
               TanStack Query
                        |
                     REST API
                        |
                    Go Backend
                        |
                    PostgreSQL
                        |
              Financial Data Layer
                        |
              Banking Integrations
```

Financial calculations, account ownership, authentication, and sensitive banking operations are handled by the backend rather than the browser.

## Project Structure

The frontend is intended to use a feature-oriented structure as development progresses.

```text
src/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── dashboard/
│   ├── accounts/
│   ├── transactions/
│   ├── budgets/
│   └── insights/
├── hooks/
├── lib/
│   ├── api/
│   └── utils/
├── routes/
├── types/
└── main.tsx
```

The actual directory structure may evolve as features are implemented.

## Getting Started

### Prerequisites

- Node.js (a version compatible with the installed Vite release)
- npm
- Git

### Clone the Repository

```bash
git clone git@github.com:rpmoulton/mint-frontend.git
cd mint-frontend
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

### Production Build

```bash
npm run build
```

## Backend Integration

Mint Frontend is designed to connect to the separate Mint Alternative Go API.

The frontend will use a centralized API client and TanStack Query for server-state management.

Planned API resources include:

| Resource | Example Endpoint |
|---|---|
| Accounts | `GET /api/v1/accounts` |
| Transactions | `GET /api/v1/transactions` |
| Budgets | `GET /api/v1/budgets` |
| Financial Summary | `GET /api/v1/summary` |
| Categories | `GET /api/v1/categories` |

These endpoints represent the intended API contract and may change during backend development.

## Development Roadmap

### Phase 1 — Foundation

- [ ] Configure application routing
- [ ] Establish responsive application layout
- [ ] Configure shared UI components
- [ ] Implement API client
- [ ] Add loading, error, and empty states

### Phase 2 — Dashboard

- [ ] Financial overview cards
- [ ] Income and expense charts
- [ ] Spending category visualization
- [ ] Recent transactions
- [ ] Account balance summaries

### Phase 3 — Financial Management

- [ ] Account management screens
- [ ] Transaction list and filters
- [ ] Transaction editing and categorization
- [ ] Monthly budget management
- [ ] Financial insights

### Phase 4 — Mobile and PWA

- [ ] Mobile-first navigation
- [ ] Responsive financial charts
- [ ] Installable PWA
- [ ] Offline handling and synchronization strategy
- [ ] Mobile usability improvements

### Phase 5 — Production Readiness

- [ ] Authentication integration
- [ ] Accessibility review
- [ ] Unit and component testing
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Production deployment configuration

## Security and Privacy

Mint Frontend is intended to handle sensitive financial information responsibly.

The application will be designed to:

- Communicate with the backend over HTTPS in production
- Avoid storing banking credentials in browser storage
- Use secure authentication and session handling
- Prevent sensitive financial data from entering analytics or error-reporting payloads
- Support appropriate authorization and account isolation through the backend
- Avoid caching sensitive financial responses in offline storage without explicit safeguards

The application is not currently security-audited and should not be used with real financial credentials until production security controls have been implemented and tested.

## Contributing

Contributions and feedback are welcome.

Contribution guidelines will be added as the project matures.

## License

License to be determined.

The project is intended to be open source. The final license will be selected after reviewing the licensing requirements of incorporated templates, components, and dependencies.

## Acknowledgments

Inspired by the original Mint personal finance application.

Built using React and the open-source frontend ecosystem, including shadcn/ui.

This project is independent and is not affiliated with or endorsed by Intuit or Mint.

---

**Mint Frontend — A clearer picture of your finances.**