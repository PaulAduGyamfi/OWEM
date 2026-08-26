# ADR-001: Technology stack ## Status
Accepted - [today's date] ## Context
Solo builder. Needs iOS, Android, and web. Handles money.
## Decision
- App: Expo (React Native) + TypeScript, with React Native Web - Server: C# / ASP.NET Core
- Database: PostgreSQL
- Photos: AWS S3
- Mobile builds: EAS
## Consequences
+ One app codebase becomes three platforms.
+ C# decimal means no floating-point money bugs.
+ Native camera control, which directly improves AI accuracy. - Two languages to maintain.
- Store review adds days to every mobile release.