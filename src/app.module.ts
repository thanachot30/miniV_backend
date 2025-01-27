import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { WebsocketGateway } from './websocket/websocket/websocket.gateway';
import { CallbackController } from './callback/callback/callback.controller';
@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, AuthController, CallbackController],
  providers: [AppService, AuthService, WebsocketGateway],
})
export class AppModule {}
