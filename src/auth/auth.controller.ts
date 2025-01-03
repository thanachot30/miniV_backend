import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { username: string }) {
    console.log('username', body.username);
    return this.authService.generateRegistrationOptions(body.username);
  }

  @Post('register/verify')
  async verifyRegistration(
    @Body() body: { username: string; credential: any },
  ) {
    return this.authService.verifyRegistration(body.username, body.credential);
  }

  @Post('login')
  async login(@Body() body: { username: string }) {
    console.log('back', body.username);
    return this.authService.generateAuthenticationOptions(body.username);
  }

  @Post('login/verify')
  async verifyLogin(@Body() body: { username: string; credential: any }) {
    return this.authService.verifyAuthentication(
      body.username,
      body.credential,
    );
  }

  @Get('user')
  user() {
    return this.authService.GetUser();
  }
}
