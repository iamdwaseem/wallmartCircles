# Walmart Circle - Real-time Collaborative Shopping App

## Overview

Walmart Circle is a real-time collaborative shopping platform that allows users to create and join shopping circles where they can chat, manage shared shopping carts, assign tasks, and vote on items. Built with a modern full-stack architecture using React, Node.js, and PostgreSQL with real-time WebSocket communication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state, React Context for global state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with Passport.js local strategy
- **Real-time Communication**: WebSocket server for live updates
- **Session Management**: Express sessions with PostgreSQL store

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with migrations
- **Schema**: Shared schema definitions between client and server
- **Connection**: Neon serverless driver for PostgreSQL

## Key Components

### Authentication System
- JWT-based authentication with refresh tokens
- Passport.js local strategy for login/registration
- Password hashing with bcrypt
- Session management for WebSocket connections

### Real-time Features
- WebSocket server for live chat, cart updates, and notifications
- Room-based messaging system for circles
- Typing indicators and user presence
- Real-time voting on cart items

### Data Models
- **Users**: Authentication and profile information
- **Circles**: Shopping groups with budget tracking
- **CircleMembers**: Role-based membership (admin/member)
- **Messages**: Chat with threading support (reply-to)
- **CartItems**: Shared shopping cart with voting system
- **Tasks**: Assignment and tracking system
- **Notifications**: User alerts and updates

### UI Components
- Responsive design with mobile-first approach
- Dark/light theme support via CSS custom properties
- Component library based on Radix UI primitives
- Toast notifications for user feedback
- Modal dialogs for forms and confirmations

## Data Flow

### Client-Server Communication
1. **HTTP APIs**: RESTful endpoints for CRUD operations
2. **WebSocket**: Real-time bidirectional communication
3. **Authentication**: JWT tokens in Authorization headers
4. **Query Management**: TanStack Query for caching and synchronization

### Real-time Updates
1. User joins circle → WebSocket room subscription
2. Actions (chat, cart updates) → WebSocket broadcast to room
3. Client receives updates → UI automatically refreshes
4. Optimistic updates for better UX

### State Management
- **Server State**: TanStack Query with automatic caching
- **Authentication State**: React Context with localStorage persistence
- **Socket State**: React Context managing WebSocket connections
- **Form State**: React Hook Form with Zod validation

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **wouter**: Lightweight router
- **zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint/Prettier**: Code formatting and linting

### Authentication & Security
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token management
- **passport**: Authentication middleware
- **express-session**: Session management

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: ESBuild bundles Node.js server
- **Database**: Migrations run via Drizzle Kit
- **Environment**: Production mode with optimizations

### Development Workflow
1. **Hot Reload**: Vite HMR for instant feedback
2. **Type Safety**: TypeScript compilation checking
3. **Database**: Push schema changes with `npm run db:push`
4. **Real-time**: WebSocket server runs alongside Express

### Architecture Decisions

#### Why Drizzle ORM?
- **Type Safety**: Full TypeScript support with schema inference
- **Performance**: Lightweight with minimal overhead
- **Developer Experience**: Better than raw SQL, simpler than heavy ORMs
- **Flexibility**: Easy to write complex queries when needed

#### Why TanStack Query?
- **Caching**: Automatic background refetching and caching
- **Synchronization**: Keeps UI in sync with server state
- **Performance**: Reduces unnecessary network requests
- **Developer Experience**: Excellent DevTools and error handling

#### Why WebSocket over Server-Sent Events?
- **Bidirectional**: Need both client-to-server and server-to-client communication
- **Real-time**: Chat and collaborative features require instant updates
- **Connection Management**: Better control over connection lifecycle
- **Scalability**: Can handle multiple concurrent users per circle

#### Why Wouter over React Router?
- **Bundle Size**: Minimal footprint for simple routing needs
- **Simplicity**: Less complex than React Router for this use case
- **Performance**: Faster route matching and navigation
- **Flexibility**: Easy to customize and extend