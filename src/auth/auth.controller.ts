import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface authProp {
  response: string;
  data: any;
}
enum result {
  success = 'success',
  failed = 'failed',
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { wallet_user_id: string }): Promise<authProp> {
    console.log('username', body.wallet_user_id);
    try {
      const _data = await this.authService.generateRegistrationOptions(
        body.wallet_user_id,
      );
      return {
        response: result.success,
        data: _data,
      };
    } catch (error) {
      throw new HttpException(
        {
          response: result.failed,
          data: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register/verify')
  async verifyRegistration(
    @Body() body: { wallet_user_id: string; credential: any },
  ) {
    try {
      const _data = await this.authService.verifyRegistration(
        body.wallet_user_id,
        body.credential,
      );
      return {
        response: result.success,
        data: _data,
      };
    } catch (error) {
      throw new HttpException(
        {
          response: result.failed,
          data: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  async login(@Body() body: { wallet_user_id: string }) {
    console.log(body.wallet_user_id);
    try {
      const _data = await this.authService.generateAuthenticationOptions(
        body.wallet_user_id,
      );
      return {
        response: result.success,
        data: _data,
      };
    } catch (error) {
      throw new HttpException(
        {
          response: result.failed,
          data: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login/verify')
  async verifyLogin(@Body() body: { wallet_user_id: string; credential: any }) {
    try {
      const _data = await this.authService.verifyAuthentication(
        body.wallet_user_id,
        body.credential,
      );
      return {
        response: result.success,
        data: _data,
      };
    } catch (error) {
      throw new HttpException(
        {
          response: result.failed,
          data: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user')
  listUser() {
    return this.authService.GetUser();
  }
}
