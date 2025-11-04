# Project Structure

## colocation

```text
next-project
├── app
│   ├── layout.js 
│   ├── page.js // route: "/"
│   └── dashboard // subdirectory
│        ├── _components 
│        ├── layout.js 
│        └── page.js // route: "/dashboard"
├── components // shared components
├── lib // shared libraries
│   ├── services // shared service logic
│   ├── utils
│   │   ├── index.js // 通用工具函式
│   │   ├── client.js // 客戶端專用工具
│   │   └── server.js // 伺服器端專用工具
│   ├── types // shared types
├── hooks
│   ├── swr // restful clients/swr hooks
├── public 
├── server // server-side code
│   ├── services // service logic
│   ├── db // database logic
│   ├── definitions // type definitions/zod schemas
│   ├── actions // server actions
│   ├── prisma // database schema and migrations
│   │   ├── migrations
│   │   ├── seed.js
│   │   ├── seeds
│   │   └── schema.prisma
│   └── helpers // server-side helpers
├── styles // global styles

```

## Rules

- keep all pages in the `app` directory is a Server Component. Import other components from `_components` or others directories.
- prisma schema and migrations should be in the `server/db` directory.
- shared components should be in the `components` directory.

專用於伺服器的外部函式庫應該放在 server 資料夾中，而不是 lib，以保持責任分離和專案結構的清晰性。lib 應僅存放跨環境可共用的工具和函式庫。

_data is for async functions that loads with the page.
_actions is for server actions.
_helpers is for any other synchronous functions.
_components is for components used in this route.

-server
   -actions
   -db
   -functions

I'm happy keeping a server folder with all server codes in it. Db are for RSC calls with import "server-only" mark. Functions are just helpers for actions and db which also is server-only marked. While actions are for server actions.