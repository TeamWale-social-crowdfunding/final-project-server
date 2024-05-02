import { JwtAuthGuard } from '@app/common';
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { CreatePostDto } from './dto/create-new-post.dto';
import { LikePostDto } from './dto/like-post.dto';
import { PostsService } from './posts.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { filesUploadLimit } from './constants/constants';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { DeletePostDto } from './dto/delete-post-dto';
import { PostErrors } from './errors/posts.errors';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiOperation({ description: 'Create new post' })
  @ApiCreatedResponse({ description: 'Return new post' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files[]', filesUploadLimit))
  @Post()
  async createPost(
    @Payload() data: CreatePostDto,
    @Req() request: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.postsService.createPost(
      data,
      new Types.ObjectId(request.user._id),
      files,
    );
  }

  @ApiOperation({ description: 'Like or unlike to a post' })
  @UseGuards(JwtAuthGuard)
  @Patch('like')
  async like(@Payload() data: LikePostDto, @Req() request: any) {
    return this.postsService.likePost(
      new Types.ObjectId(data.post_id),
      request.user._id,
    );
  }

  @ApiOperation({
    description: 'Delete a Post, available for only post owner or admin',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('delete')
  async postDelete(@Payload() data: DeletePostDto, @Req() request: any) {
    if (!request.user.roles.includes('admin')) {
      const post = await this.postsService.getPostById(
        new Types.ObjectId(data.post_id),
      );

      if (post.user_id !== request.user._id) {
        throw new HttpException(
          PostErrors.ONLY_PERMITTION_OWNER,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return await this.postsService.deletePostById(
      new Types.ObjectId(data.post_id),
    );
  }

  @ApiOperation({
    description: 'Update post, avaible for admin and post owner',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  async updatePost(@Payload() data: UpdatePostDto, @Req() request: any) {
    if (!request.user.roles.includes('admin')) {
      const post = await this.postsService.getPostById(
        new Types.ObjectId(data.post_id),
      );

      if (post.user_id !== request.user._id) {
        throw new HttpException(
          PostErrors.ONLY_PERMITTION_OWNER,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return await this.postsService.updatePost(data);
  }
}
