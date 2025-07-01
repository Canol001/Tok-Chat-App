chat-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Home, Chat
│   │   ├── components/     # ChatBox, MessageBubble, UserList
│   │   ├── services/       # axios.ts, socket.ts
│   │   └── App.tsx
│   └── package.json
├── server/
│   ├── uploads/            # image files (local or S3)
│   ├── models/User.js
│   ├── models/Message.js
│   ├── routes/chatRoutes.js
│   ├── server.js
│   └── package.json
