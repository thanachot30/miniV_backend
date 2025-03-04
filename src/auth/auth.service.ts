import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  WebAuthnCredential,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';

export interface User {
  username: string;
  credential?: any;
}
export interface GetUserResponse {
  user: Record<string, any>; // Replace `any` with the specific type of `userDB`
  Challenges: Record<string, string>;
}

// interface User {
//   username: string;
//   credentials?: any;
// }
export interface LoggedInUser {
  id: string;
  username: string;
  credentials: WebAuthnCredential[];
}
const loggedInUserId = 'internalUserId';

@Injectable()
export class AuthService {
  private userDB: Record<string, User> = {}; // Simple in-memory user database
  private expectedChallenges: Record<string, string> = {};
  constructor(private configService: ConfigService) {}

  private rp_id = this.configService.get<string>('RP_ID');
  private rp_name = this.configService.get<string>('RP_NAME');
  private rp_origin = this.configService.get<string>('RP_ORIGIN');

  private inMemoryUserDB: { [loggedInUserId: string]: LoggedInUser } = {
    [loggedInUserId]: {
      id: loggedInUserId,
      username: `user@internalUserId`,
      credentials: [],
    },
  };
  //...........Registration.........
  async generateRegistrationOptions(wallet_user_id: string) {
    if (!wallet_user_id) {
      throw new HttpException(
        'wallet_user_id is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    let user = this.inMemoryUserDB[wallet_user_id];

    console.log('user', user);

    if (!user) {
      user = {
        id: wallet_user_id,
        username: wallet_user_id,
        credentials: [],
      };
      this.inMemoryUserDB[wallet_user_id] = user;
    }

    //console.log('user', user);
    const { username, credentials } = user;
    console.log('credentials: ', credentials);

    //console.log(this.rp_name, this.rp_origin);
    const options = await generateRegistrationOptions({
      userDisplayName: `display name: ${username}`,
      rpName: this.rp_name,
      rpID: this.rp_id,
      // userID: username,
      timeout: 10000,
      attestationType: 'none',
      userName: username,
      supportedAlgorithmIDs: [-7, -257],
      // excludeCredentials: credentials.map((cred) => ({
      //   id: cred.id,
      //   type: 'public-key',
      //   transports: cred.transports,
      // })),
      excludeCredentials: [],
      authenticatorSelection: {
        residentKey: 'required',
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
    });
    this.expectedChallenges[username] = options.challenge;
    // user.expectedChallenge = options.challenge;
    // console.log("Stored challenge:", user.expectedChallenge);
    return options;
  }

  async verifyRegistration(
    wallet_user_id: string,
    body: RegistrationResponseJSON,
  ) {
    const user = this.inMemoryUserDB[wallet_user_id];
    if (!user) {
      throw new HttpException('user not found', HttpStatus.BAD_REQUEST);
    }
    const { username, credentials } = user;
    //console.log('expectedChallenges', this.expectedChallenges[username]);
    const expectedChallenge = this.expectedChallenges[username];

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.rp_origin,
        expectedRPID: this.rp_id,
      });
    } catch (error) {
      console.log(error);
      throw error(`${error}`);
    }
    // console.log('verification', verification);
    console.log('verification registrationInfo', verification.registrationInfo);

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;
      // console.log('credential', credential);
      // console.log(user.credentials);

      const existingCredential = user.credentials.find(
        (cred) => cred.id === credential.id,
      );
      //console.log(existingCredential);
      if (!existingCredential) {
        const newCredential: WebAuthnCredential = {
          id: credential.id,
          publicKey: credential.publicKey,
          counter: credential.counter,
          transports: body.response.transports,
        };
        user.credentials.push(newCredential);
      }
    }
    this.expectedChallenges[username] = undefined;

    console.log(JSON.stringify(this.inMemoryUserDB, null, 2));
    console.log('this.expectedChallenges', this.expectedChallenges);

    return { message: 'Registration successful' };
  }

  //..........Authentication................
  async generateAuthenticationOptions(wallet_user_id: string) {
    const user = this.inMemoryUserDB[wallet_user_id];
    console.log('all user', this.inMemoryUserDB);

    if (!user) {
      throw new HttpException('user not found', HttpStatus.BAD_REQUEST);
    }
    const { username } = user;
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID: process.env.RP_ID,
      userVerification: 'required',
      allowCredentials: user.credentials.map((cred) => ({
        id: cred.id,
        type: 'public-key',
        transports: cred.transports,
      })),
    });

    this.expectedChallenges[username] = options.challenge;
    //console.log(this.expectedChallenges);

    return options;
  }

  async verifyAuthentication(
    wallet_user_id: string,
    body: AuthenticationResponseJSON,
  ) {
    const user = this.inMemoryUserDB[wallet_user_id];

    if (!user) {
      throw new HttpException('user not found', HttpStatus.BAD_REQUEST);
    }
    const { username } = user;
    const expectedChallenge = this.expectedChallenges[username];

    let dbCredential: WebAuthnCredential | undefined;
    //find user credentials in db
    for (const cred of user.credentials) {
      if (cred.id === body.id) {
        dbCredential = cred;
        break;
      }
    }
    if (!dbCredential) {
      throw new HttpException(
        'Authenticator is not registered with this site',
        HttpStatus.BAD_REQUEST,
      );
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.rp_origin,
        expectedRPID: this.rp_id,
        credential: dbCredential,
        requireUserVerification: true,
      });
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }

    console.log(
      'verification authenticationInfo:',
      verification.authenticationInfo,
    );

    const { verified, authenticationInfo } = verification;
    // console.log('verified', verified, authenticationInfo);

    //
    this.expectedChallenges[username] = undefined;
    return {
      verified,
    };
  }

  GetUser() {
    const allUser = this.inMemoryUserDB;
    return allUser;
  }
}
