import { Injectable } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

export interface User {
  username: string;
  credential?: any;
}
export interface GetUserResponse {
  user: Record<string, any>; // Replace `any` with the specific type of `userDB`
  Challenges: Record<string, string>;
}

@Injectable()
export class AuthService {
  private userDB: Record<string, User> = {}; // Simple in-memory user database
  private expectedChallenges: Record<string, string> = {};

  //...........Registration.........
  async generateRegistrationOptions(username: string) {
    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME,
      rpID: process.env.RP_ID,
      //userID: username,
      userName: username,
      supportedAlgorithmIDs: [-7, -257],
      authenticatorSelection: {
        // Defaults
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
        // Optional
        authenticatorAttachment: 'platform',
      },
    });

    this.userDB[username] = { username }; // Store user
    this.expectedChallenges[username] = options.challenge; // Store challenge

    console.log('userDB', this.userDB);
    console.log('expectedChallenges', this.expectedChallenges);

    return options;
  }

  async verifyRegistration(
    username: string,
    response: RegistrationResponseJSON,
  ) {
    const expectedChallenge = this.expectedChallenges[username];
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: process.env.RP_ORIGIN,
      expectedRPID: process.env.RP_ID,
    });

    if (verified) {
      this.userDB[username].credential = registrationInfo;
      return { message: 'Registration successful' };
    } else {
      throw new Error('Verification failed');
    }
  }
  //..........Authentication................

  async generateAuthenticationOptions(username: string) {
    const user = this.userDB[username];
    if (!user || !user.credential) throw new Error('User not found');

    console.log('user', user);

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID,
      allowCredentials: [
        {
          id: user.credential.credential.id,
          transports: user.credential.transports, // Optional: Specify transports
        },
      ],
      userVerification: 'required',
    });

    this.expectedChallenges[username] = options.challenge;

    console.log(this.userDB);
    console.log(this.expectedChallenges);

    return options;
  }

  async verifyAuthentication(username: string, credential: any) {
    const user = this.userDB[username];
    const expectedChallenge = this.expectedChallenges[username];

    //console.log('user.credential', user.credential.credential);

    const { verified } = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.RP_ORIGIN,
      expectedRPID: process.env.RP_ID,
      credential: user.credential.credential,
    });

    if (verified) {
      return { message: 'Login successful' };
    } else {
      throw new Error('Authentication failed');
    }
  }

  GetUser(): GetUserResponse {
    return {
      user: this.userDB,
      Challenges: this.expectedChallenges,
    };
  }
}
