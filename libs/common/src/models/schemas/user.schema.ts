import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';
import { Schema as MongooseShema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User extends AbstractDocument {
  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  googleId: string;

  @Prop()
  dateOfBirth: Date;

  @Prop({ defaultValue: 'https://avatar.iran.liara.run/public' })
  avatar: string;

  @Prop({ type: [String], enum: ['user', 'admin'], default: ['user'] })
  roles: string[];

  @Prop([
    { refreshToken: String, createdAt: { type: Date, default: Date.now } },
  ])
  authenticate: {
    refreshToken: string;
    createdAt: Date;
  }[];

  @Prop()
  bio: string;

  @Prop({ type: [MongooseShema.Types.ObjectId], ref: 'User' })
  follower: User[];

  @Prop({ type: [MongooseShema.Types.ObjectId], ref: 'User' })
  following: User[];
}

export const UserSchema = SchemaFactory.createForClass(User);
