import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import LocalJwtAuthGuard from '../guards/local-jwt-auth.guard';
import { CreateUserRequest } from './dto/create-user.request';
import { FollowUserDto } from './dto/follow-user.dto';
import { UsersService } from './users.service';

@Controller('auth/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ description: 'register new user' })
  @Post('register')
  async createUser(@Body() request: CreateUserRequest) {
    return this.usersService.createUser(request);
  }

  @Get('id')
  getUserById(@Req() request: any) {
    return this.usersService.getUserById(new Types.ObjectId(request.user._id));
  }

  @UseGuards(LocalJwtAuthGuard)
  @Get('current')
  getCurrentUser(@Req() request: any) {
    return this.usersService.getUserById(new Types.ObjectId(request.user._id));
  }

  @Get()
  getAll() {
    return this.usersService.getAll();
  }

  @MessagePattern({ cmd: 'get-user-details' })
  async getUserDetails(@Payload() data: any) {
    return this.usersService.returnUserDetail(new Types.ObjectId(data.userId));
  }

  @ApiOperation({ description: 'follow or unfollow a user by current user' })
  @ApiUnauthorizedResponse({ description: 'login first to follow user' })
  @UseGuards(LocalJwtAuthGuard)
  @Patch('follow')
  userFollow(@Payload() data: FollowUserDto, @Req() request: any) {
    return this.usersService.userFollow({
      currentUserId: new Types.ObjectId(request.user._id),
      targetUserId: new Types.ObjectId(data.user_id),
    });
  }
}
