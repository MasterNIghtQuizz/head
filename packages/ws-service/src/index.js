import { WebSocketServer } from "ws";
import { userConnect, userDisconnect } from "./handlers/presence.handler.js";

const wss = new WebSocketServer({ port: 3000 });

wss.on("connection", (ws, req) => {
  // display userName and userId from query params

  ws.on("message", (message) => {
    console.log(`req: ${JSON.stringify(req)}`);
    console.log("Reçu:", message.toString());

    ws.send("Hello client 👋");
  });

  ws.on("close", (ws) => {
    userDisconnect(ws);
    console.log("Client déconnecté");
  });
});

console.log("WebSocket server lancé sur ws://localhost:3000");
