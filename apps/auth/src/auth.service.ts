import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import RefreshToken from './entities/refresh-token.entity';
import { sign, verify, decode } from 'jsonwebtoken';
import { UsersService } from './users/users.service';
import { Types } from 'mongoose';
import { User } from '@app/common/models/schemas/user.schema';
import { GoogleAuthDto } from './users/dto/google-auth.request';
import { GOOGLE_LOGIN_ACTIONS } from './constants/roles.enum';
import { UsersRepository } from '@app/common/repositories/users.repository';
import { generateRandomPassword } from './utils';
import { CreateChatUserArg, createChatUser } from './utils/chat.auth';

export interface TokenPayload {
  userId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async login(
    user: User,
    response: Response,
    values: { userAgent: string; ipAddress: string },
  ) {
    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get('JWT_EXPIRATION'),
    );

    const expiresLogin = new Date();
    expiresLogin.setSeconds(
      expiresLogin.getSeconds() +
        this.configService.get('JWT_REFRESH_EXPIRATION'),
    );

    const payload = await this.newRefreshAndAccessToken(user, values);

    await this.userService.addNewRefreshToken({
      refreshToken: payload.refreshToken,
      user_id: user._id,
    });

    response.cookie('Authentication', payload.accessToken, {
      httpOnly: true,
      expires,
    });

    response.cookie('RefreshToken', payload.refreshToken, {
      httpOnly: true,
      expires: expiresLogin,
    });

    response.cookie('Roles', payload.roles, {
      httpOnly: true,
      expires: expiresLogin,
    });

    return user;
  }

  async logout(
    response: Response,
    values: { refreshToken: string; user_id: Types.ObjectId },
  ): Promise<void> {
    await this.userService.removeRefreshToken(values);

    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(),
    });

    response.cookie('RefreshToken', '', {
      httpOnly: true,
      expires: new Date(),
    });

    response.cookie('Roles', '', {
      httpOnly: true,
      expires: new Date(),
    });
  }

  async refresh(refreshToken: string, response: Response) {
    const user = await this.retrieveRefreshToken(refreshToken);
    if (!user) {
      throw new HttpException('refreshToken invalid!', HttpStatus.UNAUTHORIZED);
    }

    const newAccessToken = sign(
      {
        userId: user._id,
        roles: user.roles,
      },
      this.configService.get('JWT_SECRET'),
      {
        expiresIn: '3600s',
      },
    );

    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get('JWT_EXPIRATION'),
    );

    response.cookie('Authentication', newAccessToken, {
      httpOnly: true,
      expires,
    });
  }

  private async retrieveRefreshToken(refreshStr: string): Promise<User | null> {
    try {
      const decoded = verify(
        refreshStr,
        this.configService.get('REFRESH_SECRET'),
      );
      if (typeof decoded === 'string') {
        return undefined;
      }
      return Promise.resolve(
        await this.userService.verifiyRefreshTokenLoggedIn({
          refreshToken: refreshStr,
          user_id: decoded.id,
        }),
      );
    } catch (e) {
      throw new HttpException('refreshToken invalid!', HttpStatus.UNAUTHORIZED);
    }
  }

  private async newRefreshAndAccessToken(
    user: User,
    values: { userAgent: string; ipAddress: string },
  ): Promise<{ accessToken: string; refreshToken: string; roles: any }> {
    const refreshObject = new RefreshToken({
      user_id: user._id,
      userAgent: values.userAgent,
      ipAddress: values.ipAddress,
      roles: user.roles,
    });
    return {
      accessToken: sign(
        {
          userId: user._id,
          roles: user.roles,
        },
        this.configService.get('JWT_SECRET'),
        {
          expiresIn: '3600s',
        },
      ),
      refreshToken: refreshObject.sign(),
      roles: user.roles,
    };
  }

  async googleAuth(
    data: GoogleAuthDto,
    response: Response,
    values: { userAgent: string; ipAddress: string },
  ) {
    console.log('Enter Google Auth');
    const isRegistedUser = await this.usersRepository.findOne({
      email: data.email,
    });

    if (isRegistedUser) {
      await this.login(isRegistedUser, response, values);
      return {
        ...isRegistedUser,
        action: GOOGLE_LOGIN_ACTIONS.LOGIN,
        authenticate: null,
      };
    } else {
      console.log('Enter Google Auth: NEW USER');
      const newUser = await this.userService.createUser({
        email: data.email,
        password: generateRandomPassword(10),
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(),
        avatar: data.avatar,
        googleId: data.googleId,
        bio: 'string',
      });

      const newChatUser: CreateChatUserArg = {
        avatar: data.avatar,
        username: data.email,
        secret: 'google',
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
      };

      await createChatUser(newChatUser);
      await this.login(newUser, response, values);

      return {
        ...newUser,
        action: GOOGLE_LOGIN_ACTIONS.REGISTER,
        authenticate: null,
      };
    }
  }
}
