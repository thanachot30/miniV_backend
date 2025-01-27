import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  path: '/ws', // Optional: Customize the WebSocket path (e.g., ws://localhost:3000/ws)
  cors: {
    origin: '*', // Allow all origins for development
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server; // WebSocket server instance

  handleConnection(client: WebSocket) {
    console.log('Client connected');
    client.send(
      JSON.stringify({ message: 'Welcome to the WebSocket server!' }),
    );
  }

  handleDisconnect(client: WebSocket) {
    console.log('Client disconnected');
  }

  @SubscribeMessage('messageToServer')
  handleMessage(@MessageBody() data: string) {
    console.log('Message received from client:', data);
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ message: `Server received: ${data}` }));
      }
    });
  }
}
