import { Body, Controller, Post } from '@nestjs/common';
import { WebsocketGateway } from '../../websocket/websocket/websocket.gateway';
@Controller('callback')
export class CallbackController {
  constructor(private readonly websocketGateway: WebsocketGateway) {}

  @Post()
  handleCallback(@Body() body: any) {
    console.log('Received data from /callback:', body);

    // Send data to all WebSocket clients
    this.websocketGateway.handleMessage(JSON.stringify(body));

    return { message: 'Data sent to WebSocket clients', data: body };
  }
}
