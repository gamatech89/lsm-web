# LSM Web Frontend

React + TypeScript + Vite frontend for the LSM Platform.

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Ant Design** - UI components
- **React Router** - Routing
- **React Query** - Data fetching
- **i18next** - Internationalization

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will run at `http://localhost:3000`

## Environment Variables

Create `.env` file:

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

For production, create `.env.production`:

```bash
VITE_API_URL=https://api.wartung-ls.com/api/v1
```

## Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

The built files in `dist/` should be deployed to the web server:

```bash
# Build for production
npm run build

# Deploy to Hostinger
scp -r dist/* wartung-ls:~/websites/0Am1u87de/public_html/
```

## Project Structure

```
src/
├── components/      # Reusable components
├── layouts/         # Page layouts
├── lib/            # Utilities (API client, i18n)
├── pages/          # Route pages
└── App.tsx         # Root component
```
